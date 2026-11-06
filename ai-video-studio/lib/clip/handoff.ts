// v1.27(V1) 긴 영상 → 쇼츠 화면이 고른 구간을 같은 탭의 영상 합치기 화면(/edit?from=clip)으로 넘긴다.
// V2(2026-11-06) 해설 교차편집도 같은 길로 해설 파일·촬영본·장면 배치를 넘긴다.
// 영상 파일은 서버에 올리지 않으므로 화면 이동(같은 문서) 동안 메모리에만 둔다. 새로고침하면 사라진다.
import type { Piece } from "./clipPlan";
import type { CrossScene } from "./crossCut";

export type ClipHandoff = { kind?: "clip"; file: File; name: string; pieces: Piece[] };
export type CrossCutHandoff = { kind: "narrate"; narration: File; footage: File[]; scenes: CrossScene[] };
export type Handoff = ClipHandoff | CrossCutHandoff;

let pending: Handoff | null = null;

export function setClipHandoff(h: Handoff) {
  pending = h;
}

/** 꺼내면 비운다(한 번만 넣음) */
export function takeClipHandoff(): Handoff | null {
  const h = pending;
  pending = null;
  return h;
}
