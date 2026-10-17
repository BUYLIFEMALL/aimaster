// [이미지 모델 교체 2026-10-17] 구형(gemini-nano-banana-2.1·gemini-nano-banana-2.1·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image·경량 1K는 gemini-3.1-flash-lite-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
// 플레이리스트 채널 제작 자동화 — 공용 타입·상수 (서버·브라우저 공용)

export type Provider = "gemini" | "openai" | "anthropic";

export const PROVIDER_LABELS: Record<Provider, string> = {
  gemini: "Google Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic Claude",
};

export interface TextModel { id: string; provider: Provider; label: string; inPer1M: number; outPer1M: number }
export const TEXT_MODELS: TextModel[] = [
  { id: "gemini-2.5-flash", provider: "gemini", label: "Gemini 2.5 Flash (빠름·기본)", inPer1M: 0.3, outPer1M: 2.5 },
  { id: "gemini-2.5-flash-lite", provider: "gemini", label: "Gemini 2.5 Flash-Lite (가장 저렴)", inPer1M: 0.1, outPer1M: 0.4 },
  { id: "gpt-4o-mini", provider: "openai", label: "OpenAI GPT-4o mini (저렴)", inPer1M: 0.15, outPer1M: 0.6 },
  { id: "gpt-4o", provider: "openai", label: "OpenAI GPT-4o", inPer1M: 2.5, outPer1M: 10 },
  { id: "claude-haiku-5-5", provider: "anthropic", label: "Claude Haiku 5.5 (빠름)", inPer1M: 1, outPer1M: 5 },
  { id: "claude-sonnet-5-5", provider: "anthropic", label: "Claude Sonnet 5.5 (고품질)", inPer1M: 3, outPer1M: 15 },
];
export const DEFAULT_TEXT_MODEL = "gemini-2.5-flash";

export interface ImageModel { id: string; provider: "gemini" | "openai"; label: string; perImage: number }
// Claude는 이미지를 만들지 못하므로 이미지 모델은 Gemini·OpenAI만 제공한다.
export const IMAGE_MODELS: ImageModel[] = [
  { id: "gemini-3.1-flash-lite-image", provider: "gemini", label: "나노 바나나 (Gemini Flash Image · 빠름)", perImage: 0.039 },
  { id: "gemini-3-pro-image", provider: "gemini", label: "나노 바나나 프로 (고화질 · 본인 Google 결제 연결 필요)", perImage: 0.134 },
  { id: "gpt-image-1", provider: "openai", label: "OpenAI gpt-image-1 (본인 OpenAI 키)", perImage: 0.04 },
];
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-lite-image";

export const textModelById = (id: string) => TEXT_MODELS.find((m) => m.id === id);
// 2026-10-17 이전에 저장된 구형 모델 값은 새 모델로 바꿔 찾는다(구형 모델 지원 종료 대비).
const LEGACY_IMAGE_MODEL: Record<string, string> = {
  "gemini-nano-banana-2.1": "gemini-3.1-flash-lite-image",
  "gemini-3-pro-image": "gemini-3-pro-image",
};
export const imageModelById = (id: string) => IMAGE_MODELS.find((m) => m.id === (LEGACY_IMAGE_MODEL[id] ?? id));

export interface LlmChoice { textModel: string; imageModel: string }

export const LIMITS = {
  maxProjects: 30,
  titleCount: 10,
  sunoMaxChars: 900,
  hashtags: 5,
  keywords: 15,
  songsMin: 1,
  songsMax: 20,
  personaImageBytes: 3_000_000,
};

export interface Genre { id: string; label: string; en: string; emoji: string; group: "base" | "extra" }
// base: 참고 사이트와 같은 기본 장르(+기존 구성), extra: 플레이리스트 채널에서 수요가 많아 추가한 추천 장르
export const GENRES: Genre[] = [
  { id: "lofi", label: "로파이 힙합", en: "Lo-fi Hip Hop", emoji: "🎧", group: "base" },
  { id: "pop", label: "팝", en: "Pop", emoji: "🎉", group: "base" },
  { id: "jazz", label: "재즈", en: "Jazz", emoji: "🎷", group: "base" },
  { id: "rnb", label: "R&B / 소울", en: "R&B / Soul", emoji: "🌙", group: "base" },
  { id: "kpop", label: "K-Pop", en: "K-Pop", emoji: "🎤", group: "base" },
  { id: "indie", label: "인디 팝", en: "Indie Pop", emoji: "🌿", group: "base" },
  { id: "study", label: "공부 / 집중", en: "Study / Focus", emoji: "📚", group: "base" },
  { id: "workout", label: "운동 / 워크아웃", en: "Workout", emoji: "🏋️", group: "base" },
  { id: "meditation", label: "명상 / 힐링", en: "Meditation", emoji: "🧘", group: "base" },
  { id: "acoustic", label: "어쿠스틱 포크", en: "Acoustic Folk", emoji: "🎸", group: "base" },
  { id: "ballad", label: "발라드", en: "Ballad", emoji: "💌", group: "base" },
  { id: "citypop", label: "시티팝", en: "City Pop", emoji: "🌆", group: "base" },
  { id: "edm", label: "EDM / 하우스", en: "EDM / House", emoji: "⚡", group: "base" },
  { id: "cinematic", label: "시네마틱 / 클래식", en: "Cinematic / Classical", emoji: "🎻", group: "base" },
  { id: "sleep", label: "수면 / 앰비언트", en: "Sleep / Ambient", emoji: "😴", group: "extra" },
  { id: "cafe", label: "카페 보사노바", en: "Cafe Bossa Nova", emoji: "☕", group: "extra" },
  { id: "synthwave", label: "드라이브 신스웨이브", en: "Synthwave / Night Drive", emoji: "🚗", group: "extra" },
  { id: "piano", label: "클래식 피아노", en: "Classical Piano", emoji: "🎹", group: "extra" },
  { id: "hiphop", label: "힙합", en: "Hip Hop", emoji: "🧢", group: "extra" },
  { id: "rock", label: "록 / 밴드", en: "Rock / Band", emoji: "🤘", group: "extra" },
  { id: "trot", label: "트로트", en: "Trot", emoji: "💃", group: "extra" },
  { id: "christmas", label: "캐럴 / 시즌", en: "Christmas / Seasonal", emoji: "🎄", group: "extra" },
  { id: "tropical", label: "트로피컬 / 레게", en: "Tropical / Reggae", emoji: "🌴", group: "extra" },
];
/** 장르 카드 id면 영어 이름, 직접 입력한 장르면 그대로 */
export const genreName = (g: string) => GENRES.find((x) => x.id === g)?.en ?? g;
export const genreLabel = (g: string) => GENRES.find((x) => x.id === g)?.label ?? g;
export const genreId = (g: string) => (GENRES.some((x) => x.id === g) ? g : "custom");

export interface Lang { id: string; label: string; en: string }
export const LANGS: Lang[] = [
  { id: "ko", label: "한국어", en: "Korean" },
  { id: "en", label: "English", en: "English" },
  { id: "ja", label: "日本語", en: "Japanese" },
  { id: "es", label: "Español", en: "Spanish" },
  { id: "fr", label: "Français", en: "French" },
];
export const langName = (id: string) => LANGS.find((l) => l.id === id)?.en ?? "Korean";

export interface Metaphor { level: 1 | 2 | 3 | 4; label: string; hint: string }
export const METAPHORS: Metaphor[] = [
  { level: 1, label: "직설", hint: "감정과 상황을 그대로 말하는 쉬운 가사" },
  { level: 2, label: "약한 비유", hint: "가끔 비유를 섞은 대중적인 가사" },
  { level: 3, label: "풍부한 비유", hint: "이미지와 비유가 많은 감성 가사" },
  { level: 4, label: "시적 상징", hint: "상징과 은유 중심의 문학적 가사" },
];

export interface Structure { id: string; label: string; sections: string[] }
export const STRUCTURES: Structure[] = [
  { id: "classic", label: "클래식 팝 (Verse-Chorus)", sections: ["Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Bridge", "Chorus"] },
  { id: "simple", label: "심플 (Verse-Chorus 단순형)", sections: ["Verse 1", "Chorus", "Verse 2", "Chorus", "Outro"] },
  { id: "ballad", label: "발라드형", sections: ["Verse 1", "Verse 2", "Chorus", "Verse 3", "Chorus", "Bridge", "Last Chorus"] },
  { id: "kpop", label: "K-Pop 하이라이트형", sections: ["Intro Hook", "Verse 1", "Pre-Chorus", "Chorus", "Verse 2", "Pre-Chorus", "Chorus", "Dance Break", "Bridge", "Last Chorus"] },
  { id: "aaba", label: "AABA (재즈·스탠더드)", sections: ["A Section", "A Section", "B Section (Bridge)", "A Section"] },
  { id: "lofi", label: "로파이 루프형", sections: ["Verse 1", "Hook", "Verse 2", "Hook"] },
  { id: "hookfirst", label: "후크 먼저", sections: ["Hook", "Verse 1", "Chorus", "Verse 2", "Chorus", "Outro"] },
  { id: "storytelling", label: "스토리텔링형", sections: ["Verse 1", "Verse 2", "Verse 3", "Chorus", "Verse 4", "Final Chorus"] },
  { id: "edm", label: "EDM 빌드업-드롭", sections: ["Verse", "Build-up", "Drop", "Verse 2", "Build-up", "Drop", "Outro"] },
  { id: "mantra", label: "만트라 반복형", sections: ["Verse", "Mantra Chorus", "Verse", "Mantra Chorus"] },
  { id: "short", label: "숏폼 (1분 내외)", sections: ["Verse", "Chorus", "Outro"] },
  { id: "bridgeheavy", label: "브릿지 강조형", sections: ["Verse 1", "Chorus", "Verse 2", "Chorus", "Long Bridge", "Final Chorus"] },
  { id: "cinematic", label: "시네마틱 빌드형", sections: ["Verse 1", "Rising Verse 2", "Chorus", "Climax", "Soft Outro"] },
  { id: "acoustic", label: "어쿠스틱 서정형", sections: ["Verse 1", "Verse 2", "Chorus", "Verse 3", "Chorus", "Outro"] },
  { id: "freeverse", label: "자유시형 (코러스 없음)", sections: ["Stanza 1", "Stanza 2", "Stanza 3", "Stanza 4"] },
];
export const GENRE_BEST_STRUCTURE: Record<string, string> = {
  lofi: "lofi", pop: "classic", jazz: "aaba", rnb: "classic", kpop: "kpop", indie: "simple",
  study: "lofi", workout: "edm", meditation: "mantra", acoustic: "acoustic", ballad: "ballad",
  citypop: "classic", edm: "edm", cinematic: "cinematic", sleep: "cinematic", cafe: "simple",
  synthwave: "hookfirst", piano: "cinematic", hiphop: "hookfirst", rock: "classic", trot: "classic",
  christmas: "simple", tropical: "simple",
};
export const structureById = (id: string) => STRUCTURES.find((s) => s.id === id);
export function resolveStructure(id: string, genre: string): Structure {
  if (id === "auto") return structureById(GENRE_BEST_STRUCTURE[genre] ?? "classic")!;
  return structureById(id) ?? STRUCTURES[0];
}

export interface ThumbStyle { id: string; label: string; prompt: string }
export const THUMB_STYLES: ThumbStyle[] = [
  { id: "cinematic", label: "시네마틱 포토", prompt: "cinematic photograph, moody natural light, shallow depth of field, subtle film grain" },
  { id: "anime", label: "애니메이션 일러스트", prompt: "high quality anime-style illustration, soft cel shading, detailed background, warm atmosphere" },
  { id: "lofi", label: "로파이 감성", prompt: "lo-fi aesthetic illustration, cozy room at night, warm lamp light, soft pastel colors, nostalgic mood" },
  { id: "neon", label: "네온 시티", prompt: "neon-lit city at night, synthwave palette, glowing reflections, rainy streets, vivid magenta and cyan" },
  { id: "vintage", label: "빈티지 필름", prompt: "vintage 35mm film photograph, faded warm tones, light leaks, analog texture" },
  { id: "watercolor", label: "수채화 파스텔", prompt: "soft watercolor painting, pastel palette, gentle gradients, dreamy and airy" },
  { id: "minimal", label: "미니멀 그래픽", prompt: "minimal flat graphic design, simple geometric shapes, limited color palette, clean negative space" },
];
export const thumbStyleById = (id: string) => THUMB_STYLES.find((s) => s.id === id) ?? THUMB_STYLES[0];

export interface ThumbFont { id: string; label: string; family: string; weight: number }
export const THUMB_FONTS: ThumbFont[] = [
  { id: "notokr", label: "노토 산스 블랙", family: "Noto Sans KR", weight: 900 },
  { id: "blackhan", label: "블랙 한 산스", family: "Black Han Sans", weight: 400 },
  { id: "dohyeon", label: "도현", family: "Do Hyeon", weight: 400 },
  { id: "jua", label: "주아", family: "Jua", weight: 400 },
  { id: "gowunbatang", label: "고운바탕", family: "Gowun Batang", weight: 700 },
  { id: "myeongjo", label: "나눔명조 엑스트라볼드", family: "Nanum Myeongjo", weight: 800 },
  { id: "pen", label: "나눔펜 손글씨", family: "Nanum Pen Script", weight: 400 },
  { id: "gaegu", label: "개구", family: "Gaegu", weight: 700 },
  { id: "himelody", label: "하이멜로디", family: "Hi Melody", weight: 400 },
  { id: "songmyung", label: "송명", family: "Song Myung", weight: 400 },
  { id: "dokdo", label: "동해 독도", family: "East Sea Dokdo", weight: 400 },
  { id: "gugi", label: "구기", family: "Gugi", weight: 400 },
  { id: "sunflower", label: "해바라기", family: "Sunflower", weight: 700 },
  { id: "poorstory", label: "푸어스토리", family: "Poor Story", weight: 400 },
];
export const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?" +
  [
    "Noto+Sans+KR:wght@900", "Black+Han+Sans", "Do+Hyeon", "Jua", "Gowun+Batang:wght@700", "Nanum+Myeongjo:wght@800",
    "Nanum+Pen+Script", "Gaegu:wght@700", "Hi+Melody", "Song+Myung", "East+Sea+Dokdo", "Gugi", "Sunflower:wght@700", "Poor+Story",
  ].map((f) => `family=${f}`).join("&") + "&display=swap";

export interface LyricsOptions {
  language: string;        // 주 언어
  secondLanguage: string;  // 이중 언어(빈 문자열이면 사용 안 함)
  secondRatio: number;     // 보조 언어 비율 10~90 (%)
  songCount: number;       // 1~20
  metaphor: 1 | 2 | 3 | 4;
  structure: string;       // "auto" 또는 STRUCTURES id
  intro: boolean;          // 인트로에도 가사 넣기
  outro: boolean;          // 아웃트로에도 가사 넣기
  instrumental: boolean;   // 연주곡 모드(가사 없음, 구조·분위기만)
  theme: string;           // 선택: 가사 주제 메모
}
export const DEFAULT_LYRICS_OPTIONS: LyricsOptions = {
  language: "ko", secondLanguage: "", secondRatio: 30, songCount: 5, metaphor: 2,
  structure: "auto", intro: false, outro: false, instrumental: false, theme: "",
};

export interface SunoVariant { name: string; style: string; note: string }
export interface SongLyrics { no: number; title: string; structure: string[]; lyrics: string }
export interface MetaResult { description: string; hashtags: string[]; keywords: string[] }
export interface UsageInfo { model: string; inputTokens: number; outputTokens: number; ms: number; images?: number }

export interface ProjectContent {
  suno?: SunoVariant[];
  lyrics?: { options: LyricsOptions; songs: SongLyrics[] };
  meta?: MetaResult;
}

export interface ThumbSettings {
  style: string;
  font: string;
  size: number;      // 0.05~0.15 (이미지 높이 대비 글자 크기)
  color: string;
  bold: boolean;
  text: string;      // 썸네일에 얹을 글자
  position: "top" | "center" | "bottom";
}
export const DEFAULT_THUMB_SETTINGS: ThumbSettings = {
  style: "cinematic", font: "notokr", size: 0.1, color: "#ffffff", bold: true, text: "", position: "bottom",
};
