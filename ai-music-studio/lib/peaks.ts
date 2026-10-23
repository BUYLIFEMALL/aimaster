// 실제 소리 파형 막대 — 디코딩한 소리 샘플을 막대 수만큼 나눠 구간마다 RMS(평균 크기)를 구하고 가장 큰 값으로 나눠 0~1로 맞춘다.
// 화면·브라우저와 분리한 순수 함수라 시험으로 확인한다(디코딩은 components/player/usePeaks.ts).
export function peaksFromChannels(channels: Float32Array[], bars: number): number[] {
  const len = channels.length ? Math.min(...channels.map((c) => c.length)) : 0;
  if (bars <= 0 || len === 0) return [];
  const out: number[] = [];
  const size = len / bars;
  // 긴 곡도 빠르게: 구간마다 최대 2,000개만 골라 계산
  for (let b = 0; b < bars; b++) {
    const from = Math.floor(b * size);
    const to = Math.max(from + 1, Math.floor((b + 1) * size));
    const stride = Math.max(1, Math.floor((to - from) / 2000));
    let sum = 0, n = 0;
    for (let i = from; i < to; i += stride) {
      let v = 0;
      for (const c of channels) v += c[i];
      v /= channels.length;
      sum += v * v; n++;
    }
    out.push(n ? Math.sqrt(sum / n) : 0);
  }
  const max = Math.max(...out);
  return max > 0 ? out.map((v) => Math.round((v / max) * 1000) / 1000) : out.map(() => 0);
}

/** 0~1 값을 막대 높이(%)로 — 조용한 구간도 보이게 최소 12% */
export const peakToHeight = (v: number) => Math.round(12 + Math.max(0, Math.min(1, v)) * 88);
