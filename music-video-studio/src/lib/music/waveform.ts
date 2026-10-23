// v1.25 곡 파형 — 화면·node 시험이 함께 쓰는 순수 함수(가져오기 없음).

/** 소리 샘플을 buckets칸으로 나눠 칸마다 가장 큰 소리 크기(0~1, 가장 큰 칸이 1)를 돌려준다. 소리가 없으면 0만 */
export function computePeaks(samples: Float32Array | number[], buckets: number): number[] {
  const n = Math.max(1, Math.floor(buckets) || 1);
  const len = samples.length;
  const out = new Array<number>(n).fill(0);
  if (!len) return out;
  for (let b = 0; b < n; b++) {
    const start = Math.floor((b * len) / n);
    const end = Math.max(start + 1, Math.floor(((b + 1) * len) / n));
    let max = 0;
    for (let i = start; i < end && i < len; i++) {
      const v = Math.abs(samples[i]);
      if (v > max) max = v;
    }
    out[b] = max;
  }
  const top = Math.max(...out);
  return top > 0 ? out.map((v) => Math.round((v / top) * 1000) / 1000) : out;
}

/** 장면 길이(초) 목록 → 장면이 바뀌는 시각(초) 목록(첫 장면 시작 0과 끝은 빼고) */
export function cutTimes(lengths: number[]): number[] {
  const out: number[] = [];
  let t = 0;
  for (let i = 0; i < lengths.length - 1; i++) {
    t += Math.max(0, Number(lengths[i]) || 0);
    out.push(Math.round(t * 100) / 100);
  }
  return out;
}
