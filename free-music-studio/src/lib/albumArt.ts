// 앨범 그림 설명(이 프로그램 고유 — 공용화하지 않음, docs/IMAGE_PROMPT_RULES.md). 순수 함수 — 시험 tests/albumArt.test.mjs.
// AI 작곡 기획이 준 영어 「앨범 그림 설명」(art_prompt)이 있으면 그것을, 없으면 곡 제목·스타일로 채운다(추가 AI 호출 없음).

export const ART_PROMPT_LIMIT = 1000;

// 앨범 화풍(2026-11-08 주인님 「기본적으로 실사 사진으로 만들게 하고 앨범 화풍을 선택할 수 있는 버튼」) — 기본 실사 사진
export const ART_STYLES = [
  { id: "photo", label: "📷 실사 사진", en: "photorealistic photograph shot on a full-frame camera with a 50mm lens, natural light, real-world textures, shallow depth of field, ultra-detailed; not an illustration, not a painting, not a 3D render" },
  { id: "cinematic", label: "🎬 영화 장면", en: "cinematic film still, anamorphic lens, dramatic motivated lighting, subtle film grain, movie-like color grading, photorealistic" },
  { id: "film", label: "🎞️ 빈티지 필름", en: "vintage 35mm film photograph, warm Kodak Portra colors, soft grain, gentle light leaks, nostalgic mood, photorealistic" },
  { id: "illustration", label: "🎨 일러스트", en: "polished digital illustration, clean shapes, vibrant colors, concept-art quality" },
  { id: "anime", label: "✨ 애니메이션", en: "Japanese anime style illustration, cel shading, detailed painted background" },
  { id: "watercolor", label: "💧 수채화", en: "watercolor painting on textured paper, soft washes, gentle bleeding edges" },
  { id: "oil", label: "🖌️ 유화", en: "oil painting on canvas, visible brush strokes, rich impasto texture" },
  { id: "render3d", label: "🧊 3D 렌더", en: "3D render, soft global illumination, smooth stylized materials" },
  { id: "minimal", label: "◻️ 미니멀", en: "minimalist graphic design, flat colors, simple geometric shapes, generous negative space" },
] as const;
export type ArtStyleId = (typeof ART_STYLES)[number]["id"];
export const DEFAULT_ART_STYLE: ArtStyleId = "photo";
/** 모르는 값이면 기본(실사 사진) */
export const artStyleOf = (id: unknown) => ART_STYLES.find((s) => s.id === id) ?? ART_STYLES[0];
/** 그림 모델에 보내기 직전 화풍을 맨 앞에 붙인다(내 PC 그림 — 설명문이 다른 화풍이어도 고른 화풍이 이기도록) */
export const withArtStyle = (prompt: string, id: unknown) => `${artStyleOf(id).en}. ${prompt}`;

/** Gemini 그림 모델에 보낼 설명 */
export function albumArtPrompt({ title, style, art, artStyle }: { title: string; style: string; art?: string | null; artStyle?: unknown }): string {
  const scene = String(art ?? "").trim() || `an evocative visual interpretation of a song titled "${String(title).trim()}" with this musical mood: ${String(style).trim().slice(0, 300)}`;
  return [
    "Square 1:1 album cover artwork, high quality, cohesive color palette, strong central composition, suitable as a music streaming cover.",
    `Art style (must follow): ${artStyleOf(artStyle).en}.`,
    `Scene: ${scene}`,
    // 핵심 원칙 3: 사람이 나오면 한국인 기본, 글자·로고·실존 인물 금지
    "If any person appears, depict them as Korean. Absolutely no text, letters, numbers, typography, logos, watermarks or real/famous people anywhere in the image.",
  ].join("\n");
}
