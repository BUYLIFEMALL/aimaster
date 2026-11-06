// v1.27(V1) 긴 영상 → 쇼츠 화면이 고른 구간을 같은 탭의 영상 합치기 화면(/edit?from=clip)으로 넘긴다.
// 영상 파일은 서버에 올리지 않으므로 화면 이동(같은 문서) 동안 메모리에만 둔다. 새로고침하면 사라진다.
import type { Piece } from "./clipPlan";

export type ClipHandoff = { file: File; name: string; pieces: Piece[] };

let pending: ClipHandoff | null = null;

export function setClipHandoff(h: ClipHandoff) {
  pending = h;
}

/** 꺼내면 비운다(한 번만 넣음) */
export function takeClipHandoff(): ClipHandoff | null {
  const h = pending;
  pending = null;
  return h;
}
