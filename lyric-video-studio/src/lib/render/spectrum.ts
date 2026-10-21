// 소리 반응(스펙트럼) — 디코딩한 음악(AudioBuffer)에서 t초 지점의 주파수 세기를 바로 계산한다.
// 재생 중 분석기(AnalyserNode)를 쓰지 않으므로 미리보기와 MP4 내보내기의 모양이 같다(되감기·느린 PC에서도 같은 값).

const N = 2048; // 한 번에 보는 소리 길이(48kHz에서 약 43ms)
const HANN = (() => { const w = new Float32Array(N); for (let i = 0; i < N; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1)); return w; })();
const re = new Float32Array(N), im = new Float32Array(N);

function fft() {
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

export interface AudioSource { mono: Float32Array; rate: number; duration: number }

/** 스테레오를 섞어 한 줄로(한 번만 만들어 둔다) */
export function toSource(buf: AudioBuffer): AudioSource {
  const a = buf.getChannelData(0), b = buf.numberOfChannels > 1 ? buf.getChannelData(1) : null;
  const mono = new Float32Array(buf.length);
  for (let i = 0; i < buf.length; i++) mono[i] = b ? (a[i] + b[i]) * 0.5 : a[i];
  return { mono, rate: buf.sampleRate, duration: buf.duration };
}

/** t초의 세기를 bands개 구간(낮은 소리→높은 소리, 0~1)으로. 소리가 없으면 0 */
export function bandsAt(src: AudioSource | null, t: number, bands: number): Float32Array {
  const out = new Float32Array(bands);
  if (!src) return out;
  const start = Math.floor(t * src.rate) - N / 2;
  for (let i = 0; i < N; i++) { const k = start + i; re[i] = (k >= 0 && k < src.mono.length ? src.mono[k] : 0) * HANN[i]; im[i] = 0; }
  fft();
  // 40Hz~14kHz를 로그 간격으로 나눈다(사람 귀에 고르게 보이도록)
  const lo = Math.log(40), hi = Math.log(14000), binHz = src.rate / N;
  for (let b = 0; b < bands; b++) {
    const f0 = Math.exp(lo + ((hi - lo) * b) / bands), f1 = Math.exp(lo + ((hi - lo) * (b + 1)) / bands);
    const i0 = Math.max(1, Math.floor(f0 / binHz)), i1 = Math.max(i0 + 1, Math.ceil(f1 / binHz));
    // 구간 안 가장 센 값(평균을 쓰면 음 하나가 여러 칸에 흩어져 막대가 낮게 보인다)
    let mag = 0; for (let i = i0; i < i1 && i < N / 2; i++) mag = Math.max(mag, Math.hypot(re[i], im[i]));
    const db = 20 * Math.log10(mag + 1e-9);
    out[b] = Math.min(1, Math.max(0, (db - 5) / 40)) * (0.8 + 0.2 * (b / bands)); // 높은 소리도 보이게 살짝 올림
  }
  return out;
}

/** 잔떨림을 줄이려고 조금 앞 시각과 평균한다(상태 없이 계산해 미리보기·내보내기 결과가 같다) */
export function smoothBandsAt(src: AudioSource | null, t: number, bands: number): Float32Array {
  const a = bandsAt(src, t, bands), b = bandsAt(src, Math.max(0, t - 1 / 30), bands);
  for (let i = 0; i < bands; i++) a[i] = a[i] * 0.6 + b[i] * 0.4;
  return a;
}

/** t초 근처 파형(-1~1) n점 */
export function waveAt(src: AudioSource | null, t: number, n: number): Float32Array {
  const out = new Float32Array(n);
  if (!src) return out;
  const span = Math.floor(src.rate * 0.04), start = Math.floor(t * src.rate) - span / 2;
  for (let i = 0; i < n; i++) { const k = start + Math.floor((i / n) * span); out[i] = k >= 0 && k < src.mono.length ? src.mono[k] : 0; }
  return out;
}
