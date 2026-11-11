// v1.49 장면 순서 바꾸기 — 위·아래 이웃 장면과 순서 값(segment_index)을 맞바꾼다(화면·DB와 무관한 순수 함수).
// 시험: tests/segmentOrder.test.mjs

export type MoveDir = "up" | "down";

/** 맞바꿀 이웃 장면. 맨 위에서 위로·맨 아래에서 아래로는 null */
export function swapTarget<T extends { id: string; segment_index: number }>(segments: T[], id: string, dir: MoveDir): { from: T; to: T } | null {
  const sorted = [...segments].sort((a, b) => a.segment_index - b.segment_index);
  const i = sorted.findIndex((s) => s.id === id);
  if (i < 0) return null;
  const j = dir === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= sorted.length) return null;
  return { from: sorted[i], to: sorted[j] };
}
