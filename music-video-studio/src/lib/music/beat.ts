// v1.19 곡 박자(BPM) 찾기 + 장면 전환을 박자에 맞추기 — 회원 브라우저에서 곡 소리를 직접 분석한다(서버·AI 비용 없음).
// 순수 함수(소리 표본 배열만 받음): 화면은 Web Audio로 곡을 풀어 mono 표본을 넘기고, node 시험은 합성 소리로 확인한다.
// 방법: 짧은 구간마다 소리 크기 → 커지는 정도(시작 세기) → 자기상관으로 박자 간격(60~180 BPM, 120 근처 가중) → 박 위치(위상).

export interface BeatInfo {
  /** 분당 박자 수 */
  bpm: number;
  /** 한 박 길이(초) */
  period: number;
  /** 첫 박 위치(초, 0 ≤ firstBeat < period) */
  firstBeat: number;
  /** 0~1, 박자가 뚜렷할수록 큼 */
  confidence: number;
}

const MIN_BPM = 60;
const MAX_BPM = 180;
/** 이보다 박자가 흐리면 찾지 못한 것으로 본다 */
export const MIN_CONFIDENCE = 0.15;

/** 시작 세기(onset) 곡선 — hop 표본마다 소리 크기(로그)의 증가분 */
export function onsetEnvelope(samples: Float32Array, sampleRate: number, hop = Math.round(sampleRate / 100)): { env: Float32Array; fps: number } {
  const n = Math.floor(samples.length / hop);
  const energy = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    const o = i * hop;
    for (let j = 0; j < hop; j++) { const v = samples[o + j]; s += v * v; }
    energy[i] = Math.log1p(1000 * Math.sqrt(s / hop));
  }
  const env = new Float32Array(n);
  for (let i = 1; i < n; i++) env[i] = Math.max(0, energy[i] - energy[i - 1]);
  return { env, fps: sampleRate / hop };
}

/** 곡의 박자를 찾는다. 소리가 짧거나 박자가 흐리면 null */
export function detectBeat(samples: Float32Array, sampleRate: number): BeatInfo | null {
  if (!(sampleRate > 0) || samples.length < sampleRate * 4) return null;
  const { env, fps } = onsetEnvelope(samples, sampleRate);
  const n = env.length;
  let mean = 0;
  for (let i = 0; i < n; i++) mean += env[i];
  mean /= n || 1;
  if (!(mean > 1e-6)) return null;
  const x = new Float32Array(n);
  for (let i = 0; i < n; i++) x[i] = env[i] - mean;
  let zero = 0;
  for (let i = 0; i < n; i++) zero += x[i] * x[i];
  if (!(zero > 0)) return null;

  const minLag = Math.max(1, Math.floor((60 / MAX_BPM) * fps));
  const maxLag = Math.min(n - 1, Math.ceil((60 / MIN_BPM) * fps));
  const ac = new Float32Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1 && lag < n; lag++) {
    let s = 0;
    for (let i = 0; i + lag < n; i++) s += x[i] * x[i + lag];
    ac[lag] = s / zero;
  }
  // 120 BPM 근처를 조금 더 믿는다(두 배·절반 박자 혼동 줄이기)
  let best = -1;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * fps) / lag;
    const w = Math.exp(-0.5 * (Math.log2(bpm / 120) / 1.0) ** 2);
    const score = ac[lag] * w;
    if (score > bestScore) { bestScore = score; best = lag; }
  }
  if (best < 0 || !(ac[best] > 0)) return null;
  // 꼭짓점 보간으로 소수 간격
  const a = ac[best - 1] ?? ac[best], b = ac[best], c = ac[best + 1] ?? ac[best];
  const denom = a - 2 * b + c;
  const lagF = best + (denom !== 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / denom)) : 0);
  const confidence = Math.max(0, Math.min(1, b));
  if (confidence < MIN_CONFIDENCE) return null;

  // 박 위치와 간격 미세 조정: 간격 ±2% 안에서 「간격마다 시작 세기 합」이 가장 큰 간격·위상(작은 간격 오차가 곡 끝까지 쌓이지 않게)
  let lagBest = lagF;
  let bestPhase = 0;
  let bestSum = -Infinity;
  for (let d = -0.02; d <= 0.02 + 1e-9; d += 0.001) {
    const L = lagF * (1 + d);
    const steps = Math.max(1, Math.round(L * 4));
    for (let k = 0; k < steps; k++) {
      const ph = (k / steps) * L;
      let sum = 0;
      for (let t = ph; t < n; t += L) sum += env[Math.round(t)] ?? 0;
      if (sum > bestSum) { bestSum = sum; bestPhase = ph; lagBest = L; }
    }
  }
  const period = lagBest / fps;
  return { bpm: Math.round((60 / period) * 10) / 10, period, firstBeat: Math.round((bestPhase / fps) * 1000) / 1000, confidence: Math.round(confidence * 100) / 100 };
}

/** 장면 전환을 박자에 맞춘 장면 길이(초). grid: bar = 마디(4박) 우선·멀면 박, beat = 가까운 박.
 *  장면이 minScene보다 짧아지거나 순서가 꼬이면 그 전환은 옮기지 않는다. 처음(0)과 끝(곡 길이)은 그대로 */
export function snapLengths(lengths: number[], beat: Pick<BeatInfo, "period" | "firstBeat">, grid: "bar" | "beat" = "bar", minScene = 1): number[] {
  if (lengths.length < 2 || !(beat.period > 0)) return lengths;
  const total = lengths.reduce((s, v) => s + v, 0);
  const cuts: number[] = [];
  let acc = 0;
  for (let i = 0; i < lengths.length - 1; i++) { acc += lengths[i]; cuts.push(acc); }
  const p = beat.period;
  const near = (t: number, step: number) => beat.firstBeat + Math.round((t - beat.firstBeat) / step) * step;
  let prev = 0;
  const out: number[] = [];
  cuts.forEach((t, i) => {
    let s = near(t, p);
    if (grid === "bar") { const b = near(t, p * 4); if (Math.abs(b - t) <= p * 1.5) s = b; }
    const next = i + 1 < cuts.length ? cuts[i + 1] : total;
    if (!(s - prev >= minScene && next - s >= minScene)) s = t;
    out.push(Math.round((s - prev) * 100) / 100);
    prev = s;
  });
  out.push(Math.round((total - prev) * 100) / 100);
  return out;
}
