// 마스터링 신호 처리(순수 함수) — 브라우저·테스트 공용. 오디오 파일은 서버로 보내지 않고 브라우저에서만 처리한다.
import type { MasteringParams } from "./params";

export const PRE_NORMALIZE_PEAK = 0.35; // 체인에 넣기 전 입력 피크 (헤드룸 확보)

export const dbToLin = (db: number) => Math.pow(10, db / 20);
export const linToDb = (lin: number) => (lin > 1e-9 ? 20 * Math.log10(lin) : -120);

export interface Levels { peak: number; rms: number; peakDb: number; rmsDb: number }

/** 모든 채널의 피크와 평균(RMS) 레벨 */
export function measure(channels: Float32Array[]): Levels {
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (const ch of channels) {
    for (let i = 0; i < ch.length; i++) {
      const v = ch[i];
      const a = v < 0 ? -v : v;
      if (a > peak) peak = a;
      sum += v * v;
    }
    count += ch.length;
  }
  const rms = count ? Math.sqrt(sum / count) : 0;
  return { peak, rms, peakDb: linToDb(peak), rmsDb: linToDb(rms) };
}

/** 입력 피크를 목표값으로 맞추는 배율(무음이면 1) */
export function normalizeGain(peak: number, target = PRE_NORMALIZE_PEAK): number {
  return peak > 0.001 ? target / peak : 1;
}

/** 새추레이션 웨이브셰이퍼 곡선(원본 알고리즘 포팅). drive 0이면 직선 */
export function saturationCurve(drive: number, size = 44100): Float32Array {
  const curve = new Float32Array(size);
  const deg = Math.PI / 180;
  for (let i = 0; i < size; i++) {
    const x = (i * 2) / size - 1;
    curve[i] = drive <= 0 ? x : ((3 + drive) * x * 20 * deg) / (Math.PI + drive * Math.abs(x));
  }
  return curve;
}

/** 스테레오 너비(M/S). width 100 = 변화 없음, 0 = 모노, 200 = 최대. 2채널이 아니면 그대로 */
export function applyStereoWidth(channels: Float32Array[], width: number): Float32Array[] {
  if (channels.length !== 2) return channels;
  const w = Math.min(2, Math.max(0, width / 100));
  const [l, r] = channels;
  const outL = new Float32Array(l.length);
  const outR = new Float32Array(r.length);
  for (let i = 0; i < l.length; i++) {
    const mid = (l[i] + r[i]) * 0.5;
    const side = (l[i] - r[i]) * 0.5 * w;
    outL[i] = mid + side;
    outR[i] = mid - side;
  }
  return [outL, outR];
}

/**
 * 마지막 단계 리미터(룩어헤드 방식): 피크를 ceiling에 맞춘 뒤 gain만큼 올리고, 앞으로 10ms 안에 올 피크를 미리 보고
 * 게인을 부드럽게 줄여 어떤 샘플도 ceiling을 넘지 않게 한다(release 시간에 걸쳐 원래 게인으로 복귀).
 * 채널을 묶어(링크) 같은 게인을 적용하므로 스테레오 이미지가 한쪽으로 쏠리지 않는다.
 */
export function applyLimiter(channels: Float32Array[], sampleRate: number, p: MasteringParams["limiter"]): Float32Array[] {
  const n = channels[0]?.length ?? 0;
  if (!n) return channels;
  const ceilingLin = dbToLin(p.ceiling);
  const peak = measure(channels).peak;
  const pre = (peak > 1e-4 ? ceilingLin / peak : 1) * dbToLin(p.gain);
  const look = Math.max(2, Math.floor(0.01 * sampleRate));
  const relCoef = Math.exp(-1 / Math.max(1, Math.floor(p.release * 0.001 * sampleRate)));
  const hardClip = 0.999;

  // 1) 샘플별로 필요한 게인(target): 그 샘플이 ceiling을 넘지 않게 하는 배율
  const target = new Float32Array(n + look).fill(1);
  for (let i = 0; i < n; i++) {
    let a = 0;
    for (let c = 0; c < channels.length; c++) {
      const v = channels[c][i] * pre;
      const m = v < 0 ? -v : v;
      if (m > a) a = m;
    }
    if (a > ceilingLin) target[i] = ceilingLin / a;
  }

  // 2) 앞으로 look 샘플 구간의 최솟값(미리 보기): 단조 덱으로 O(n)
  const mins = new Float32Array(n);
  const dq = new Int32Array(n + look);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < n + look; i++) {
    while (tail > head && target[dq[tail - 1]] >= target[i]) tail--;
    dq[tail++] = i;
    const o = i - look; // 창 [o, o+look]의 끝이 i
    if (o >= 0) {
      while (dq[head] < o) head++;
      if (o < n) mins[o] = target[dq[head]];
    }
  }

  // 3) 과거 look 샘플 평균으로 부드럽게(어택) + 릴리즈 곡선. 둘 다 target 이하를 보장한다
  const out = channels.map(() => new Float32Array(n));
  let sum = 0;
  let rel = 1;
  for (let o = 0; o < n; o++) {
    sum += mins[o];
    if (o >= look) sum -= mins[o - look];
    const win = Math.min(o + 1, look);
    let g = sum / win;
    // 시작 구간(과거 값이 없는 부분)은 평균 대신 현재 값을 써서 보장 유지
    if (o < look) g = Math.min(g, mins[o]);
    rel = Math.min(g, rel + (1 - rel) * (1 - relCoef));
    const gain = Math.min(g, rel);
    for (let c = 0; c < channels.length; c++) {
      let v = channels[c][o] * pre * gain;
      if (v > hardClip) v = hardClip;
      else if (v < -hardClip) v = -hardClip;
      out[c][o] = v;
    }
  }
  return out;
}

/** 16bit PCM WAV 파일 바이트를 만든다 */
export function encodeWav16(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numCh = channels.length;
  const len = channels[0]?.length ?? 0;
  const dataBytes = len * numCh * 2;
  const buf = new ArrayBuffer(44 + dataBytes);
  const v = new DataView(buf);
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
  str(0, "RIFF");
  v.setUint32(4, 36 + dataBytes, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, numCh, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * numCh * 2, true);
  v.setUint16(32, numCh * 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, dataBytes, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-0.99, Math.min(0.99, channels[c][i]));
      s = s < 0 ? s * 32768 : s * 32767;
      v.setInt16(off, Math.round(s), true);
      off += 2;
    }
  }
  return new Uint8Array(buf);
}

/** 내보낼 파일 이름: 원래 이름 + _mastering.wav */
export function masteredFileName(name: string): string {
  const base = name.replace(/\.[^/.]+$/, "").replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").trim() || "track";
  return `${base}_mastering.wav`;
}

/** 같은 이름이 겹치면 (2), (3)을 붙인다 — ZIP 안 이름 충돌 방지 */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const k = n.toLowerCase();
    const c = (seen.get(k) ?? 0) + 1;
    seen.set(k, c);
    if (c === 1) return n;
    const dot = n.lastIndexOf(".");
    return dot > 0 ? `${n.slice(0, dot)} (${c})${n.slice(dot)}` : `${n} (${c})`;
  });
}
