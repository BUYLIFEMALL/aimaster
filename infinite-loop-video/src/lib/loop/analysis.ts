// 무한루프 분석 순수 함수: 프레임 특징 추출 → 유사도 → 최적 루프 구간 탐색.
// 브라우저(Canvas)에서 뽑은 64x64 RGBA 픽셀을 입력으로 받는다. DOM 의존이 없어 node 테스트가 가능하다.
export const FRAME_SIZE = 64;
const HIST_BINS = 64;
const GRID = 32;
const COLOR_GRID = 4;

export interface FrameFeature {
  hist: Float32Array; // 밝기 히스토그램(합 1)
  luma: Float32Array; // 32x32 밝기 격자(0~1)
  color: Float32Array; // 4x4x3 평균 색(0~1)
}

export function extractFeature(rgba: Uint8ClampedArray | Uint8Array, size = FRAME_SIZE): FrameFeature {
  const hist = new Float32Array(HIST_BINS);
  const luma = new Float32Array(GRID * GRID);
  const lumaCnt = new Float32Array(GRID * GRID);
  const color = new Float32Array(COLOR_GRID * COLOR_GRID * 3);
  const colorCnt = new Float32Array(COLOR_GRID * COLOR_GRID);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = rgba[i] / 255, g = rgba[i + 1] / 255, b = rgba[i + 2] / 255;
      const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      hist[Math.min(HIST_BINS - 1, Math.floor(l * HIST_BINS))]++;
      const gi = Math.floor((y * GRID) / size) * GRID + Math.floor((x * GRID) / size);
      luma[gi] += l; lumaCnt[gi]++;
      const ci = Math.floor((y * COLOR_GRID) / size) * COLOR_GRID + Math.floor((x * COLOR_GRID) / size);
      color[ci * 3] += r; color[ci * 3 + 1] += g; color[ci * 3 + 2] += b; colorCnt[ci]++;
    }
  }
  const total = size * size;
  for (let k = 0; k < HIST_BINS; k++) hist[k] /= total;
  for (let k = 0; k < luma.length; k++) luma[k] = lumaCnt[k] ? luma[k] / lumaCnt[k] : 0;
  for (let k = 0; k < colorCnt.length; k++) for (let c = 0; c < 3; c++) color[k * 3 + c] = colorCnt[k] ? color[k * 3 + c] / colorCnt[k] : 0;
  return { hist, luma, color };
}

function meanAbsSim(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return 1 - s / a.length;
}

/** 두 프레임이 얼마나 같은지 0~1 (밝기 격자 55% + 색 격자 25% + 히스토그램 20%) */
export function frameSimilarity(a: FrameFeature, b: FrameFeature): number {
  let bc = 0;
  for (let i = 0; i < a.hist.length; i++) bc += Math.sqrt(a.hist[i] * b.hist[i]);
  const v = 0.55 * meanAbsSim(a.luma, b.luma) + 0.25 * meanAbsSim(a.color, b.color) + 0.2 * bc;
  return Math.max(0, Math.min(1, v));
}

export function buildMatrix(features: FrameFeature[]): Float32Array[] {
  const n = features.length;
  const m: Float32Array[] = Array.from({ length: n }, () => new Float32Array(n));
  for (let i = 0; i < n; i++) {
    m[i][i] = 1;
    for (let j = i + 1; j < n; j++) m[i][j] = m[j][i] = frameSimilarity(features[i], features[j]);
  }
  return m;
}

export interface LoopCandidate {
  start: number; // 프레임 번호
  end: number;
  score: number; // 0~1
}

const SMOOTH = [0.1, 0.2, 0.4, 0.2, 0.1];

/** 시작·끝 프레임 쌍을 점수화: 앞뒤 프레임까지 함께 비교(시간 평활) + 움직임 연속성 */
export function scorePair(m: Float32Array[], i: number, j: number): number {
  const n = m.length;
  let smooth = 0, wsum = 0;
  for (let k = -2; k <= 2; k++) {
    const a = i + k, b = j + k;
    if (a < 0 || b < 0 || a >= n || b >= n) continue;
    smooth += SMOOTH[k + 2] * m[a][b];
    wsum += SMOOTH[k + 2];
  }
  smooth = wsum ? smooth / wsum : m[i][j];
  const motion = i + 1 < n && j + 1 < n ? m[i + 1][j + 1] : m[i][j];
  return 0.75 * smooth + 0.25 * motion;
}

/** 최소 길이(초) 이상, 최대 길이(초) 이하에서 점수가 가장 높은 구간 상위 후보를 반환 */
export function findLoops(m: Float32Array[], fps: number, minLenSec: number, maxLenSec = 30, top = 5): LoopCandidate[] {
  const n = m.length;
  const minF = Math.max(1, Math.ceil(minLenSec * fps));
  const maxF = Math.floor(maxLenSec * fps);
  const all: LoopCandidate[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + minF; j < n && j - i <= maxF; j++) {
      const lenBonus = 0.02 * Math.min(1, (j - i) / (maxF || 1));
      all.push({ start: i, end: j, score: Math.min(1, scorePair(m, i, j) + lenBonus) });
    }
  }
  all.sort((a, b) => b.score - a.score);
  const picked: LoopCandidate[] = [];
  for (const c of all) {
    // 서로 비슷한 후보(시작·끝이 가까운 것)는 건너뛴다
    if (picked.every((p) => Math.abs(p.start - c.start) > 2 || Math.abs(p.end - c.end) > 2)) picked.push(c);
    if (picked.length >= top) break;
  }
  return picked;
}

/** 점수 → 사용자에게 보여줄 등급 */
export function qualityLabel(score: number): { label: string; level: "excellent" | "good" | "fair" | "poor" } {
  if (score >= 0.95) return { label: "매우 자연스러움", level: "excellent" };
  if (score >= 0.88) return { label: "자연스러움", level: "good" };
  if (score >= 0.75) return { label: "보통 (크로스페이드 권장)", level: "fair" };
  return { label: "어색함 (크로스페이드 필수)", level: "poor" };
}

/** 정밀 보정: 두 윈도우의 특징 목록에서 가장 닮은 (a,b) 쌍을 찾는다. 반환은 윈도우 내부 인덱스 */
export function refinePair(winA: FrameFeature[], winB: FrameFeature[]): { a: number; b: number; score: number } {
  let best = { a: 0, b: 0, score: -1 };
  for (let a = 0; a < winA.length; a++)
    for (let b = 0; b < winB.length; b++) {
      const s = frameSimilarity(winA[a], winB[b]);
      if (s > best.score) best = { a, b, score: s };
    }
  return best;
}
