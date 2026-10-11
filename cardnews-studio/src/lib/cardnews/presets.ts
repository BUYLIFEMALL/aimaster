// 카드뉴스 옵션 프리셋. 선택지 구성은 참고 도구(Google Flow "Carousel Pro")의 화면에서 확인한 항목을 따르되,
// 디자인 무드처럼 목록을 확인하지 못한 항목은 합리적인 프리셋으로 정했다(화면에서 바꿀 수 있다).

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const CATEGORIES: Option[] = [
  { value: "자기계발", label: "자기계발" },
  { value: "경제/재테크", label: "경제/재테크" },
  { value: "맛집/카페", label: "맛집/카페" },
  { value: "뷰티/패션", label: "뷰티/패션" },
];
export const CUSTOM_CATEGORY = "__custom__";

export type ToneId = "normal" | "serious" | "pride" | "humor" | "witty";
export const TONES: (Option<ToneId> & { instruction: string })[] = [
  { value: "normal", label: "일반", instruction: "자연스럽고 읽기 쉬운 일반적인 말투. 과장 없이 또렷하게." },
  { value: "serious", label: "진지", instruction: "차분하고 진지한 말투. 근거와 핵심만 단정하게, 가벼운 농담은 쓰지 않는다." },
  {
    value: "pride",
    label: "국뽕",
    instruction:
      "한국의 강점을 자랑스럽게 풀어내는 열정적인 말투. 단, 사실이 아닌 수치·순위·주장은 절대 만들지 말고 다른 나라나 사람을 깎아내리는 표현은 쓰지 않는다.",
  },
  { value: "humor", label: "유머", instruction: "재치 있고 가벼운 유머를 섞은 말투. 웃음 포인트는 한 페이지에 하나만, 정보 전달이 흐려지지 않게." },
  { value: "witty", label: "넉살", instruction: "능청스럽고 친근한 넉살 좋은 말투. 구어체로 말을 걸듯이, 과하게 선을 넘지 않는다." },
];

export type MoodId = "info" | "emotion" | "impact" | "minimal";
export const MOODS: (Option<MoodId> & {
  hint: string;
  defaults: { placement: PlacementId; bgOpacity: number; displayStyle: DisplayStyleId };
})[] = [
  { value: "info", label: "정보형", hint: "clear, informative, clean editorial feel", defaults: { placement: "center", bgOpacity: 40, displayStyle: "basic" } },
  { value: "emotion", label: "감성형", hint: "soft, warm, emotional and cozy atmosphere", defaults: { placement: "bottom", bgOpacity: 30, displayStyle: "shadow" } },
  { value: "impact", label: "임팩트형", hint: "bold, high-contrast, eye-catching and energetic", defaults: { placement: "center", bgOpacity: 45, displayStyle: "outline" } },
  { value: "minimal", label: "미니멀형", hint: "minimal, calm, lots of whitespace and simple shapes", defaults: { placement: "left", bgOpacity: 25, displayStyle: "basic" } },
];

export type VisualStyleId = "photo" | "digital" | "render3d" | "watercolor";
export const VISUAL_STYLES: (Option<VisualStyleId> & { prompt: string })[] = [
  {
    value: "photo",
    label: "실사(Photographic)",
    prompt:
      "photorealistic professional photography, natural lighting, shallow depth of field, 85mm lens look, high detail",
  },
  { value: "digital", label: "디지털 아트", prompt: "polished digital illustration, clean vector-like shapes, vibrant but harmonious colors" },
  { value: "render3d", label: "3D 렌더링", prompt: "soft 3D render, smooth materials, studio lighting, subtle shadows, modern look" },
  { value: "watercolor", label: "수채화", prompt: "delicate watercolor painting, soft washes, paper texture, gentle gradients" },
];

export type CompositionId = "background" | "infographic" | "character" | "textfocus";
export const COMPOSITIONS: (Option<CompositionId> & { prompt: string })[] = [
  { value: "background", label: "백그라운드", prompt: "an atmospheric background scene related to the topic, with calm areas suitable for overlaying text" },
  {
    value: "infographic",
    label: "인포그래픽",
    prompt: "an infographic-style layout with simple icons, shapes, arrows and empty frames (leave every label and number blank)",
  },
  { value: "character", label: "캐릭터", prompt: "a single friendly character or person as the main subject, with space left around it for text" },
  { value: "textfocus", label: "텍스트강조", prompt: "a very simple, low-detail, softly blurred background with large clean negative space so overlaid text stands out" },
];

export type ThemeColorId = "auto" | "warm" | "cool" | "mono";
export const THEME_COLORS: (Option<ThemeColorId> & { prompt: string; gradient: [string, string] })[] = [
  { value: "auto", label: "Auto", prompt: "a color palette that best fits the topic and mood", gradient: ["#334155", "#0f172a"] },
  { value: "warm", label: "Warm/Beige", prompt: "a warm beige, cream and soft orange color palette", gradient: ["#a8754f", "#5b3a26"] },
  { value: "cool", label: "Cool/Blue", prompt: "a cool blue, teal and navy color palette", gradient: ["#3b82f6", "#0f2a5c"] },
  { value: "mono", label: "Minimal/Black & White", prompt: "a minimal monochrome black, white and gray palette", gradient: ["#6b7280", "#111827"] },
];

export type PlacementId = "center" | "top" | "bottom" | "left";
export const PLACEMENTS: Option<PlacementId>[] = [
  { value: "center", label: "중앙형" },
  { value: "top", label: "상단형" },
  { value: "bottom", label: "하단형" },
  { value: "left", label: "좌측형" },
];

export type DisplayStyleId = "basic" | "shadow" | "outline" | "highlight";
export const DISPLAY_STYLES: Option<DisplayStyleId>[] = [
  { value: "basic", label: "기본" },
  { value: "shadow", label: "그림자" },
  { value: "outline", label: "외곽선" },
  { value: "highlight", label: "형광펜" },
];

export type FontId = "pretendard" | "blackhan" | "myeongjo" | "penscript";
export const FONTS: (Option<FontId> & { family: string; note: string })[] = [
  { value: "pretendard", label: "Pretendard", family: '"Pretendard Variable", Pretendard, sans-serif', note: "깔끔한 고딕" },
  { value: "blackhan", label: "블랙한산스", family: '"Black Han Sans", sans-serif', note: "굵은 제목용" },
  { value: "myeongjo", label: "나눔명조", family: '"Nanum Myeongjo", serif', note: "단정한 명조" },
  { value: "penscript", label: "나눔손글씨 펜", family: '"Nanum Pen Script", cursive', note: "손글씨" },
];

export const PAGE_COUNTS = [4, 6, 8, 10] as const;
export type PageCount = (typeof PAGE_COUNTS)[number];

export type RatioId = "4:5" | "1:1";
export const RATIOS: (Option<RatioId> & { width: number; height: number })[] = [
  { value: "4:5", label: "4:5 세로 (1080×1350)", width: 1080, height: 1350 },
  { value: "1:1", label: "1:1 정사각 (1080×1080)", width: 1080, height: 1080 },
];
