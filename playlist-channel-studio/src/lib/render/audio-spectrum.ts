// IMP-PLS-006 (v1.18) MP4 내보내기의 스펙트럼을 실제 소리로 계산한다.
// 미리보기(EditorStudio)는 브라우저 분석기(AnalyserNode, fftSize 256·기본값)의 getByteFrequencyData를 쓰므로,
// 같은 계산(블랙만 창 → FFT ÷N → 시간 평활 → dB → -100~-30dB를 0~255로)을 디코딩한 소리에 그대로 적용해 모양을 맞춘다.
// 미리보기는 화면 갱신(약 60번/초)마다 평활하므로, 내보내기는 프레임 속도에 맞춰 평활 계수를 바꾼다(0.8^(60/fps)).

export interface PcmBuffer { duration: number; sampleRate: number; numberOfChannels: number; getChannelData(ch: number): Float32Array }

const N = 256; // AnalyserNode fftSize와 같게(결과 칸 128개)
const MIN_DB = -100, MAX_DB = -30, PREVIEW_SMOOTHING = 0.8, PREVIEW_RATE = 60;
const WINDOW = (() => { // 블랙만 창(a = 0.16) — Web Audio 표준과 같음
  const w = new Float32Array(N), a0 = 0.42, a1 = 0.5, a2 = 0.08;
  for (let i = 0; i < N; i++) w[i] = a0 - a1 * Math.cos((2 * Math.PI * i) / N) + a2 * Math.cos((4 * Math.PI * i) / N);
  return w;
})();

function fft(re: Float32Array, im: Float32Array) {
  for (let i = 1, j = 0; i < N; i++) { // 비트 뒤집기
    let bit = N >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= N; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < N; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
}

/**
 * 이어 붙인 곡 목록(반복 포함 순서)에서 전체 시각 T초의 주파수 세기(0~255, 128칸)를 돌려준다.
 * 프레임 순서대로 부르면 미리보기 분석기와 같은 평활이 걸린다. 돌려주는 배열은 다음 호출 때 덮어쓴다.
 */
export function createSpectrumReader(buffers: PcmBuffer[], fps: number) {
  const tau = Math.pow(PREVIEW_SMOOTHING, PREVIEW_RATE / Math.max(1, fps));
  const ends: number[] = []; let acc = 0;
  for (const b of buffers) { acc += b.duration; ends.push(acc); }
  const re = new Float32Array(N), im = new Float32Array(N), smooth = new Float32Array(N / 2), out = new Uint8Array(N / 2);

  return function frequencyAt(T: number): Uint8Array {
    let idx = ends.findIndex((e) => T < e);
    if (idx < 0) idx = buffers.length - 1;
    const buf = buffers[idx];
    if (!buf) { out.fill(0); return out; }
    const local = T - (idx > 0 ? ends[idx - 1] : 0);
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
    const end = Math.floor(local * buf.sampleRate); // 이 시각까지의 마지막 256샘플(분석기와 같음)
    for (let i = 0; i < N; i++) {
      const k = end - N + i;
      const v = k >= 0 && k < L.length ? (R ? (L[k] + R[k]) * 0.5 : L[k]) : 0;
      re[i] = v * WINDOW[i]; im[i] = 0;
    }
    fft(re, im);
    for (let k = 0; k < N / 2; k++) {
      const mag = Math.hypot(re[k], im[k]) / N;
      smooth[k] = tau * smooth[k] + (1 - tau) * mag;
      const db = 20 * Math.log10(smooth[k] || 1e-12);
      out[k] = Math.max(0, Math.min(255, Math.floor((255 / (MAX_DB - MIN_DB)) * (db - MIN_DB))));
    }
    return out;
  };
}

/** 미리보기와 같은 저음 세기(앞 10칸 평균, 0~255) — 확대 맥동·흔들림·스트로브·필터가 쓴다 */
export function bassLevelOf(freq: Uint8Array): number {
  let s = 0; for (let b = 0; b < 10; b++) s += freq[b];
  return s / 10;
}
