import type { Audience } from "./types";

export interface AudienceInfo { id: Audience; label: string; desc: string; strategy: string; imageRule: string }

export const AUDIENCES: AudienceInfo[] = [
  {
    id: "teens", label: "10대 ~ 20대 초반", desc: "도파민 자극, 고채도, 역동적, 밈 활용",
    strategy: "Teens to early 20s: fast, dopamine-driven, meme-aware wording, high saturation, dynamic energy.",
    imageRule: "[GENERAL/TEEN AUDIENCE MODE] Font: impactful, dynamic, heavy weight. Use gradients, strokes, or drop shadows to make it pop. Layout balanced within the safe zone.",
  },
  {
    id: "adults", label: "20대 후반 ~ 40대", desc: "세련됨, 미니멀, 신뢰감, 정보성 강조",
    strategy: "Late 20s to 40s: refined, minimal, trustworthy, information-forward wording.",
    imageRule: "[GENERAL AUDIENCE MODE] Font: clean, confident, heavy weight sans-serif. Use a restrained palette with one accent color, strokes or soft shadows for legibility. Layout balanced within the safe zone.",
  },
  {
    id: "seniors", label: "50대 ~ 60대 이상 (시니어)", desc: "시인성 극대화, 원색 대비, 감정적 표현",
    strategy: "50s and older: maximum readability, plain words, primary-color contrast, warm emotional expression.",
    imageRule: "[SENIOR AUDIENCE MODE - MAXIMIZE VISIBILITY] Font: colossal size, extra bold sans-serif, thick strokes are mandatory. Contrast: maximum — bright yellow on black, or white on red. Text must occupy 30-40% of the screen.",
  },
  {
    id: "all", label: "전연령 (MrBeast 스타일)", desc: "글로벌 트렌드, 고대비, 과장된 표정, 3단어 법칙",
    strategy: "All ages, MrBeast-style: global trend, very high contrast, exaggerated expression, three-word rule.",
    imageRule: "[GENERAL/TEEN AUDIENCE MODE] Font: impactful, dynamic, heavy weight. Very high contrast, exaggerated expression, short three-word text. Use strokes or drop shadows to make it pop.",
  },
];

export function audienceInfo(id: Audience): AudienceInfo {
  return AUDIENCES.find((a) => a.id === id) ?? AUDIENCES[1];
}
