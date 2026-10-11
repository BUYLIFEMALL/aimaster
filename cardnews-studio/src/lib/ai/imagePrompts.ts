// 배경 이미지 프롬프트(영어). 글자는 이미지에 굽지 않고(우리가 캔버스로 얹는다) 인물은 기본 한국인으로 묘사한다
// (루트 CLAUDE.md 핵심 원칙 3). 사용자 입력은 길이를 자르고 <data>로 감싸 데이터로만 취급한다.
import { COMPOSITIONS, MOODS, THEME_COLORS, VISUAL_STYLES, type CompositionId, type MoodId, type PlacementId, type ThemeColorId, type VisualStyleId } from "../cardnews/presets";

export interface ImagePromptInput {
  category: string;
  topic: string;
  headline: string;
  visualStyle: VisualStyleId;
  composition: CompositionId;
  themeColor: ThemeColorId;
  mood: MoodId;
  placement: PlacementId;
  ratio: "4:5" | "1:1";
  pageIndex: number;
  pageCount: number;
  extra?: string;
}

const clean = (s: string | undefined, max: number) => (s ?? "").replace(/[<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const SAFE_AREA: Record<PlacementId, string> = {
  center: "the central area",
  top: "the upper third",
  bottom: "the lower third",
  left: "the left half",
};

export const KOREAN_PEOPLE_RULE = "If any people appear, depict them as Korean/East Asian people by default.";
export const NO_TEXT_RULE = "Do not draw any text, letters, numbers, captions, logos, watermarks or UI. The image must contain no readable writing at all.";

export function buildImagePrompt(input: ImagePromptInput): string {
  const style = VISUAL_STYLES.find((s) => s.value === input.visualStyle) ?? VISUAL_STYLES[0];
  const composition = COMPOSITIONS.find((c) => c.value === input.composition) ?? COMPOSITIONS[0];
  const theme = THEME_COLORS.find((t) => t.value === input.themeColor) ?? THEME_COLORS[0];
  const mood = MOODS.find((m) => m.value === input.mood) ?? MOODS[0];

  return [
    `Create a ${input.ratio} background image for card ${input.pageIndex + 1} of ${input.pageCount} of a Korean social-media card news series.`,
    `<data>Category: ${clean(input.category, 40)}\nTopic: ${clean(input.topic, 200)}\nThis card's message (use only for the visual mood, never write it): ${clean(input.headline, 80)}</data>`,
    `Visual style: ${style.prompt}.`,
    `Composition: ${composition.prompt}.`,
    `Color: ${theme.prompt}.`,
    `Mood: ${mood.hint}.`,
    `Keep ${SAFE_AREA[input.placement]} visually calm and uncluttered because text will be placed there later.`,
    input.extra ? `Extra request from the user: ${clean(input.extra, 200)}` : "",
    KOREAN_PEOPLE_RULE,
    NO_TEXT_RULE,
  ]
    .filter(Boolean)
    .join("\n");
}
