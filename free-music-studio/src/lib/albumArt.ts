// 앨범 그림 설명(이 프로그램 고유 — 공용화하지 않음, docs/IMAGE_PROMPT_RULES.md). 순수 함수 — 시험 tests/albumArt.test.mjs.
// AI 작곡 기획이 준 영어 「앨범 그림 설명」(art_prompt)이 있으면 그것을, 없으면 곡 제목·스타일로 채운다(추가 AI 호출 없음).

export const ART_PROMPT_LIMIT = 1000;

/** Gemini 그림 모델에 보낼 설명 */
export function albumArtPrompt({ title, style, art }: { title: string; style: string; art?: string | null }): string {
  const scene = String(art ?? "").trim() || `an evocative visual interpretation of a song titled "${String(title).trim()}" with this musical mood: ${String(style).trim().slice(0, 300)}`;
  return [
    "Square 1:1 album cover artwork, high quality, cohesive color palette, strong central composition, suitable as a music streaming cover.",
    `Scene: ${scene}`,
    // 핵심 원칙 3: 사람이 나오면 한국인 기본, 글자·로고·실존 인물 금지
    "If any person appears, depict them as Korean. Absolutely no text, letters, numbers, typography, logos, watermarks or real/famous people anywhere in the image.",
  ].join("\n");
}
