// 2026-11-20 영상 담당: 프롬프트 단계 「전체 복사」용 글 만들기(순수 함수, 네트워크·AI 호출 없음).
// 씬 번호 순서대로 한 종류(이미지 또는 영상) 프롬프트만 모은다 — 외부 생성 도구에 씬별로 붙여 넣기 쉽게 씬 머리글을 붙인다.
import type { ScenePrompt } from "@/types/svs";

export type PromptKind = "image" | "video";

export const PROMPT_COPY_LABEL: Record<PromptKind, string> = {
  image: "🖼️ 이미지 프롬프트 전체 복사",
  video: "🎥 영상 프롬프트 전체 복사",
};

/** 비어 있는 프롬프트는 건너뛴다. 모을 것이 없으면 빈 문자열(버튼을 숨기는 기준). */
export function formatScenePrompts(prompts: ScenePrompt[] | null | undefined, kind: PromptKind): string {
  const blocks = [...(prompts ?? [])]
    .sort((a, b) => a.sceneNumber - b.sceneNumber)
    .map((p) => ({ n: p.sceneNumber, text: (kind === "image" ? p.imagePrompt : p.videoPrompt)?.trim() ?? "" }))
    .filter((b) => b.text)
    .map((b) => `[SCENE ${b.n}]\n${b.text}`);
  return blocks.join("\n\n");
}

// ── 복사 표시 상태(순수 함수) — 프롬프트 생성 오류와 섞지 않는다 ─────────────────────────
// seq: 복사를 누를 때마다 1씩 오르는 순번(A2). 「복사됨」을 지우는 타이머와 완료 처리는 자기 순번이 최신일 때만 반영한다
//      → 같은 버튼을 연달아 눌러도 앞 타이머·늦게 끝난 앞 복사가 새 표시를 건드리지 않는다.
// target: 그 복사가 대상으로 삼은 프롬프트 결과(A4). 화면은 visibleCopy()로 「지금 보이는 결과」의 상태만 보여 준다
//      → 결과가 바뀌면 효과(effect)를 기다리지 않고 첫 렌더부터 이전 성공·오류가 숨겨진다.
//      식별값은 결과 객체 참조다: 같은 결과의 재렌더·다른 칸 수정에서는 참조가 유지되고, 새로 만들거나 불러올 때만 바뀐다.
export type CopyTarget = object | null;
export type CopyState = { kind: PromptKind | null; error: string | null; seq: number; target: CopyTarget };
export const COPY_IDLE: CopyState = { kind: null, error: null, seq: 0, target: null };
export const COPY_SHOWN_MS = 2000;
export const COPY_ERROR_MESSAGE = "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.";

/** 복사 성공: 그 종류에 「복사됨」, 이전 복사 오류는 지운다. */
export function copySucceeded(seq: number, kind: PromptKind, target: CopyTarget): CopyState {
  return { kind, error: null, seq, target };
}
/** 복사 실패: 「복사됨」 표시는 없애고 복사 오류만 남긴다. */
export function copyFailed(seq: number, target: CopyTarget): CopyState {
  return { kind: null, error: COPY_ERROR_MESSAGE, seq, target };
}
/** 표시 시간 끝: 자기 순번의 성공 표시만 지운다(그 사이 새 복사·실패가 있었으면 그대로 둔다). */
export function copyExpired(state: CopyState, seq: number): CopyState {
  return state.seq === seq && state.kind !== null ? { ...state, kind: null } : state;
}

/** 복사 요청 순번 문: begin()으로 받은 순번이 가장 최근 요청인지 isCurrent()로 확인한다. */
export type CopyGate = { begin(): number; isCurrent(seq: number): boolean };
export function createCopyGate(): CopyGate {
  let seq = 0;
  return { begin: () => ++seq, isCurrent: (n) => n === seq };
}

/** 복사가 끝났을 때의 다음 상태. 최신 요청이 아니면 그대로 두고, 최신이면 그 복사의 대상 결과(target)를 찍어 둔다. */
export function settleCopy(
  state: CopyState,
  gate: CopyGate,
  seq: number,
  outcome: { ok: true; kind: PromptKind } | { ok: false },
  target: CopyTarget,
): CopyState {
  if (!gate.isCurrent(seq)) return state;
  return outcome.ok ? copySucceeded(seq, outcome.kind, target) : copyFailed(seq, target);
}

/** 화면에 보일 상태: 지금 보이는 결과(current)에 대한 복사 상태만. 다른 결과의 성공·오류는 숨긴다(상태 자체는 건드리지 않음). */
export function visibleCopy(state: CopyState, current: CopyTarget): CopyState {
  return current !== null && state.target === current ? state : COPY_IDLE;
}
