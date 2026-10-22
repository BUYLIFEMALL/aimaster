// v1.15: 화질 단계 사다리와 「건너뛰기」 계산(화면과 무관한 순수 함수).

// 원본 해상도부터 시작해서 결과 GIF가 8MiB 밑으로 내려갈 때까지 해상도/색상 수를 단계적으로 낮춘다.
export const CANDIDATES = [
  { scale: 1, colors: 256 },
  { scale: 0.94, colors: 256 },
  { scale: 0.86, colors: 256 },
  { scale: 0.76, colors: 256 },
  { scale: 0.68, colors: 224 },
  { scale: 0.6, colors: 192 },
  { scale: 0.52, colors: 160 },
  { scale: 0.45, colors: 128 },
];

export const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
// 예측이 빗나가도 한 번에 맞도록 목표를 상한보다 조금 낮게 잡는다.
const TARGET_RATIO = 0.9;

/**
 * 지금 단계 결과가 상한을 넘었을 때 다음에 시도할 단계 번호. 더 낮출 단계가 없으면 -1.
 * GIF 용량은 대략 화면 면적(가로²)에 비례하므로 필요한 가로 비율 = √(목표/결과)로 어림해
 * 그 비율 이하인 첫 단계로 건너뛴다(적어도 한 칸은 내려간다).
 */
export function nextCandidateIndex(
  current: number,
  outputBytes: number,
  maxBytes: number = MAX_OUTPUT_BYTES,
  candidates: ReadonlyArray<{ scale: number }> = CANDIDATES,
): number {
  if (current + 1 >= candidates.length) return -1;
  if (!(outputBytes > maxBytes)) return current + 1;
  const wanted = candidates[current].scale * Math.sqrt((maxBytes * TARGET_RATIO) / outputBytes);
  for (let i = current + 1; i < candidates.length; i++) {
    if (candidates[i].scale <= wanted) return i;
  }
  return candidates.length - 1;
}

// 한 번에 만들기(split → palettegen → paletteuse)는 색상표가 나올 때까지 프레임(RGBA)을 메모리에 쌓는다.
export const SINGLE_PASS_MAX_BYTES = 512 * 1024 * 1024;

/**
 * 한 번에 만들기를 써도 되는지: 예상 메모리 = 가로 × 세로(가로 × 비율) × 4 × 프레임 수가 상한 이하.
 * 비율·길이를 모르면 안전하게 false(예전 두 번 방식).
 */
export function canSinglePass(width: number, aspect: number | undefined, fps: number, seconds: number | undefined): boolean {
  if (!aspect || !seconds || !(width > 0) || !(fps > 0)) return false;
  const bytes = width * Math.round(width * aspect) * 4 * Math.ceil(fps * seconds);
  return bytes <= SINGLE_PASS_MAX_BYTES;
}

/**
 * v1.16: 엔진 진행 이벤트 → 0~1 비율. 엔진의 `progress`는 입력 길이 기준이라 구간 자르기·두 번째 입력(palette.png)에서
 * 튀므로, 변환할 길이(초)를 알면 출력 시간 `time`(마이크로초) ÷ 길이로 계산한다.
 * 길이를 모르거나 계산 값이 1.2를 넘으면(단위가 다른 경우 등) 엔진의 `progress`를 쓴다.
 */
export function progressRatio(event: { progress: number; time?: number }, seconds: number | undefined): number {
  const clamp = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);
  if (seconds && seconds > 0 && typeof event.time === "number" && Number.isFinite(event.time)) {
    const byTime = event.time / (seconds * 1_000_000);
    if (byTime >= 0 && byTime <= 1.2) return clamp(byTime);
  }
  return clamp(event.progress);
}
