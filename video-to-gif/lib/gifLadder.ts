// v1.15: 화질 단계 사다리와 「건너뛰기」 계산(화면과 무관한 순수 함수).

// 원본 해상도부터 시작해서 결과 GIF가 8MiB 밑으로 내려갈 때까지 해상도/색상 수를 단계적으로 낮춘다.
// v1.19: 그래도 넘는 아주 복잡한 영상용으로 끝에 초당 장면 수(fps)를 낮추는 단계 2개.
// 재생 길이는 그대로이고, 25·20fps는 GIF 장면 간격(0.04·0.05초)이 딱 맞는 값이라 재생 속도가 어긋나지 않는다.
export type LadderStep = { scale: number; colors: number; fps?: number };

export const CANDIDATES: ReadonlyArray<LadderStep> = [
  { scale: 1, colors: 256 },
  { scale: 0.94, colors: 256 },
  { scale: 0.86, colors: 256 },
  { scale: 0.76, colors: 256 },
  { scale: 0.68, colors: 224 },
  { scale: 0.6, colors: 192 },
  { scale: 0.52, colors: 160 },
  { scale: 0.45, colors: 128 },
  { scale: 0.45, colors: 128, fps: 25 },
  { scale: 0.45, colors: 128, fps: 20 },
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
  // 아주 크게 넘으면 가장 작은 가로 단계의 첫 칸으로(v1.19: 그 뒤 fps 단계는 한 칸씩 — 맨 끝 20fps로 바로 뛰지 않게)
  const smallest = Math.min(...candidates.map((c) => c.scale));
  return candidates.findIndex((c, i) => i > current && c.scale === smallest);
}

// v1.20: 내 PC 렌더러는 단계 하나에 코어 하나만 쓰므로(색상표·디더링이 한 스레드) 아래 단계를 미리 함께 만든다.
// 미리 만들 단계 순서 — 가로 45%·60%·76% 순으로 넓게 흩어 첫 결과가 어디로 건너뛰든 이미 만들어져 있을 가능성을 높인다.
export const SPECULATIVE_ORDER = [7, 5, 3, 6, 4, 8] as const;

/**
 * v1.20: 순서대로 돌 때(nextCandidateIndex)와 **똑같은 단계를 고른다**. 다만 slots개까지 동시에 만들 수 있으면
 * 0단계와 함께 SPECULATIVE_ORDER의 단계를 미리 만들어 두어, 건너뛴 단계가 이미 끝났으면 기다리지 않는다.
 * encodeAt(i)는 i단계 결과의 바이트 수를 준다(같은 i는 한 번만 부른다). 끝까지 넘으면 index -1과 마지막 크기.
 */
export async function runLadder(
  encodeAt: (index: number) => Promise<number>,
  slots: number,
  onStep?: (index: number, attempt: number) => void,
  maxBytes: number = MAX_OUTPUT_BYTES,
  candidates: ReadonlyArray<{ scale: number }> = CANDIDATES,
): Promise<{ index: number; bytes: number }> {
  const started = new Map<number, Promise<number>>();
  const get = (i: number) => {
    let p = started.get(i);
    if (!p) {
      p = encodeAt(i);
      started.set(i, p);
      // 미리 만든 단계가 실패해도 그 단계가 실제로 필요할 때까지는 처리되지 않은 거부로 남기지 않는다.
      p.catch(() => {});
    }
    return p;
  };
  get(0);
  for (const i of SPECULATIVE_ORDER) {
    if (started.size >= Math.max(1, slots)) break;
    if (i < candidates.length) get(i);
  }
  let current = 0;
  for (let attempt = 0; ; attempt++) {
    onStep?.(current, attempt);
    const bytes = await get(current);
    if (bytes <= maxBytes) return { index: current, bytes };
    const next = nextCandidateIndex(current, bytes, maxBytes, candidates);
    if (next === -1) return { index: -1, bytes };
    current = next;
  }
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
 * v1.16~v1.17: 엔진 진행 이벤트 → 0~1 비율, 쓸 수 없는 값이면 null(무시).
 * 엔진은 색상표(palettegen) 단계 동안 출력이 없어 `time`=INT64 최대·`progress`≈9e11 같은 「값 없음」을 보낸다(v1.16 실측).
 * 이런 값을 1로 자르면 진행률이 끝 값으로 뛰므로 버린다. 정상 값은 출력 시간 `time`(마이크로초) ÷ 변환할 길이를,
 * 길이를 모르면 엔진 `progress`를 쓴다.
 */
export function progressRatio(event: { progress: number; time?: number }, seconds: number | undefined): number | null {
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  if (seconds && seconds > 0 && typeof event.time === "number" && Number.isFinite(event.time) && event.time >= 0) {
    const byTime = event.time / (seconds * 1_000_000);
    return byTime <= 1.2 ? clamp(byTime) : null;
  }
  const p = event.progress;
  return Number.isFinite(p) && p >= 0 && p <= 1.5 ? clamp(p) : null;
}
