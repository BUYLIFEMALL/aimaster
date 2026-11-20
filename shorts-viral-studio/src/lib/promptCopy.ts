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
