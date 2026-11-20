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

// 2026-11-20 A2(맥미니 P3): 복사 표시 상태를 순수 함수로 — 프롬프트 생성 오류와 섞지 않는다.
// seq는 복사를 누를 때마다 1씩 오르는 순번. 「복사됨」을 2초 뒤 지우는 타이머는 자기 순번일 때만 지운다
// → 같은 버튼을 연달아 눌러도 앞 타이머가 새 표시를 일찍 지우지 않는다(표시 시간이 다시 2초).
export type CopyState = { kind: PromptKind | null; error: string | null; seq: number };
export const COPY_IDLE: CopyState = { kind: null, error: null, seq: 0 };
export const COPY_SHOWN_MS = 2000;
export const COPY_ERROR_MESSAGE = "복사하지 못했습니다. 브라우저의 클립보드 권한을 확인해 주세요.";

/** 복사 성공: 그 종류에 「복사됨」, 이전 복사 오류는 지운다. */
export function copySucceeded(seq: number, kind: PromptKind): CopyState {
  return { kind, error: null, seq };
}
/** 복사 실패: 「복사됨」 표시는 없애고 복사 오류만 남긴다. */
export function copyFailed(seq: number): CopyState {
  return { kind: null, error: COPY_ERROR_MESSAGE, seq };
}
/** 표시 시간 끝: 자기 순번의 성공 표시만 지운다(그 사이 새 복사·실패가 있었으면 그대로 둔다). */
export function copyExpired(state: CopyState, seq: number): CopyState {
  return state.seq === seq && state.kind !== null ? { ...state, kind: null } : state;
}

// 2026-11-20 A3(맥미니): 복사 요청을 「대상 결과」에 묶는다. 프롬프트 결과가 바뀌거나 초기화되면 invalidate()로
// 진행 중이던 복사를 무효로 만들어, 늦게 끝난 성공·실패가 새 화면에 상태를 쓰지 못하게 한다.
export type CopyGate = { begin(): number; invalidate(): void; isCurrent(seq: number): boolean };
export function createCopyGate(): CopyGate {
  let seq = 0;
  return {
    begin: () => ++seq,
    invalidate: () => {
      seq += 1;
    },
    isCurrent: (n) => n === seq,
  };
}

/** 복사가 끝났을 때의 다음 상태. 최신 요청이 아니면(다시 눌렀거나 결과가 바뀌었으면) 상태를 그대로 둔다. */
export function settleCopy(
  state: CopyState,
  gate: CopyGate,
  seq: number,
  outcome: { ok: true; kind: PromptKind } | { ok: false },
): CopyState {
  if (!gate.isCurrent(seq)) return state;
  return outcome.ok ? copySucceeded(seq, outcome.kind) : copyFailed(seq);
}
