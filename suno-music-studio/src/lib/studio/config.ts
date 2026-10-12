export const PROVIDERS = ["gemini", "openai", "anthropic"] as const;
export type Provider = (typeof PROVIDERS)[number];
export const MODELS = [
  { provider: "gemini", id: "gemini-3.8-flash", name: "Gemini 3.8 Flash" },
  {
    provider: "gemini",
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
  },
  { provider: "openai", id: "gpt-4.1", name: "GPT-4.1" },
  { provider: "openai", id: "gpt-4.1-mini", name: "GPT-4.1 mini" },
  { provider: "anthropic", id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" },
  { provider: "anthropic", id: "claude-haiku-5-5", name: "Claude Haiku 5.5" },
] as const;
export function isProvider(v: unknown): v is Provider {
  return PROVIDERS.some((p) => p === v);
}
export const ARCS = [
  "감정 여정",
  "스토리 아크",
  "테마 통일",
  "다양한 분위기",
  "사계절",
  "하루의 흐름",
] as const;
export const VOICES = [
  "자연스러운 보컬",
  "부드러운 여성 보컬",
  "중저음 남성 보컬",
  "혼성 듀엣",
  "코러스 중심",
  "남성 솔로",
  "여성 솔로",
  "남성 듀엣",
  "여성 듀엣",
  "남성 그룹",
  "여성 그룹",
  "혼성 그룹",
  "남성 합창",
  "여성 합창",
] as const;
export const STRUCTURES = [
  "표준",
  "후렴 선행",
  "점층 전개",
  "댄스 드롭",
  "자유 전개",
] as const;
export const ARRANGEMENTS = [
  "자동",
  "팝 코러스",
  "콜 앤 리스폰스",
  "라이브 밴드",
  "가스펠",
  "EDM 드롭",
  "아이돌 응원 코러스",
  "스타디움 록",
  "애니메이션 주제가",
  "펑크 갱 보컬",
] as const;
export const TITLE_LANGUAGES = [
  "자동",
  "한국어",
  "영어",
  "일본어",
  "다국어",
] as const;
export const ERAS = [
  "modern",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
  "1940s",
  "1930s",
  "1920s",
  "global",
] as const;
export const MARKETS = ["한국 가요", "POP", "장르·월드"] as const;
export const VOICE_TERMS: Record<string, string> = {
  "자연스러운 보컬": "natural vocals",
  "부드러운 여성 보컬": "soft female vocals",
  "중저음 남성 보컬": "warm male vocals",
  "혼성 듀엣": "male and female duet",
  "코러스 중심": "layered choir vocals",
  "남성 솔로": "male solo vocals",
  "여성 솔로": "female solo vocals",
  "남성 듀엣": "male vocal duet",
  "여성 듀엣": "female vocal duet",
  "남성 그룹": "male vocal group",
  "여성 그룹": "female vocal group",
  "혼성 그룹": "mixed vocal group",
  "남성 합창": "male choir",
  "여성 합창": "female choir",
};
export interface Brief {
  era: string;
  market: string;
  styleGroup: string;
  presetId: string;
  presetVoice: string;
  titleLanguage: string;
  highPitchRestraint: boolean;
  differentRapVoice: boolean;
  rapVoice: string;
  bpmHint: boolean;
  useContext: boolean;
  generateTitle: boolean;
  generateStyle: boolean;
  generateLyrics: boolean;
  harmony: boolean;
  callResponse: boolean;
  arrangement: string;
  concept: string;
  intent: string;
  genre: string;
  mood: string;
  instruments: string;
  bpm: number;
  voice: string;
  englishPct: number;
  rapPct: number;
  metaphorPct: number;
  instrumental: boolean;
  cues: boolean;
  structure: string;
  locked: boolean;
  style: string;
  exclude: string;
  arc: string;
  count: number;
  model: string;
  customModel: boolean;
  provider: Provider;
}
export interface Track {
  id: string;
  title: string;
  summary: string;
  style: string;
  exclude: string;
  lyrics: string;
  bpm: number;
  hook: string;
  reviewed: boolean;
}
export interface Album {
  title: string;
  summary: string;
  tracks: Track[];
}
export interface Draft {
  brief: Brief;
  song: Track | null;
  album: Album | null;
}
export interface SavedItem {
  id: string;
  name: string;
  savedAt: string;
  draft: Draft;
}
export interface Store {
  schema: 1;
  draft: Draft;
  saved: SavedItem[];
  styles: SavedStyle[];
}
export interface SavedStyle {
  id: string;
  name: string;
  style: string;
  exclude: string;
  bpm: number;
  savedAt: string;
}
export const DEFAULT_BRIEF: Brief = {
  customModel: false,
  era: "global",
  market: "장르·월드",
  styleGroup: "",
  presetId: "",
  presetVoice: "자연스러운 보컬",
  titleLanguage: "자동",
  highPitchRestraint: false,
  differentRapVoice: false,
  rapVoice: "남성 솔로",
  bpmHint: true,
  useContext: true,
  generateTitle: true,
  generateStyle: true,
  generateLyrics: true,
  harmony: false,
  callResponse: false,
  arrangement: ARRANGEMENTS[0],
  concept: "",
  intent: "",
  genre: "acoustic pop",
  mood: "warm",
  instruments: "acoustic guitar, piano",
  bpm: 90,
  voice: VOICES[0],
  englishPct: 0,
  rapPct: 0,
  metaphorPct: 40,
  instrumental: false,
  cues: true,
  structure: STRUCTURES[0],
  locked: false,
  style: "",
  exclude: "",
  arc: ARCS[0],
  count: 6,
  model: MODELS[0].id,
  provider: "gemini",
};
export const EMPTY_DRAFT: Draft = {
  brief: DEFAULT_BRIEF,
  song: null,
  album: null,
};
export const TAGS = {
  genre: [
    "acoustic pop",
    "k-pop",
    "city pop",
    "r&b",
    "lo-fi hip hop",
    "jazz",
    "synthwave",
    "rock",
    "house",
    "ambient",
    "trot",
    "folk",
  ],
  mood: [
    "warm",
    "hopeful",
    "melancholic",
    "energetic",
    "dreamy",
    "intimate",
    "cinematic",
    "playful",
  ],
  instruments: [
    "acoustic guitar",
    "piano",
    "strings",
    "synth bass",
    "drum machine",
    "brass",
    "electric guitar",
    "pad",
    "percussion",
  ],
};
export interface Preset {
  name: string;
  category: "장르" | "댄스";
  genre: string;
  mood: string;
  instruments: string;
  bpm: number;
  description: string;
}
// Independently authored recipes; no reference-site corpus or artist signatures.
export const PRESETS: Preset[] = [
  {
    name: "따뜻한 어쿠스틱",
    category: "장르",
    genre: "acoustic pop",
    mood: "warm, intimate",
    instruments: "acoustic guitar, piano, brushed drums",
    bpm: 86,
    description: "작은 공간에서 들려주는 담백한 이야기",
  },
  {
    name: "도시의 밤",
    category: "장르",
    genre: "city pop",
    mood: "dreamy, nostalgic",
    instruments: "electric piano, synth bass, clean guitar",
    bpm: 108,
    description: "야간 드라이브와 산뜻한 베이스",
  },
  {
    name: "서정 발라드",
    category: "장르",
    genre: "pop ballad",
    mood: "melancholic, emotional",
    instruments: "piano, strings, soft drums",
    bpm: 72,
    description: "감정이 점차 커지는 피아노 발라드",
  },
  {
    name: "청춘 밴드",
    category: "장르",
    genre: "indie rock",
    mood: "hopeful, energetic",
    instruments: "electric guitar, bass guitar, live drums",
    bpm: 132,
    description: "라이브 밴드의 힘 있는 전개",
  },
  {
    name: "밤의 R&B",
    category: "장르",
    genre: "contemporary r&b",
    mood: "intimate, smooth",
    instruments: "electric piano, sub bass, sparse drums",
    bpm: 82,
    description: "공간감과 부드러운 그루브",
  },
  {
    name: "집중 로파이",
    category: "장르",
    genre: "lo-fi hip hop",
    mood: "relaxed, mellow",
    instruments: "jazz piano, muted bass, vinyl texture",
    bpm: 78,
    description: "보컬 없이도 어울리는 작업 음악",
  },
  {
    name: "빈티지 재즈",
    category: "장르",
    genre: "vocal jazz",
    mood: "elegant, relaxed",
    instruments: "upright bass, brushed drums, jazz piano",
    bpm: 94,
    description: "따뜻한 소규모 재즈 편성",
  },
  {
    name: "시네마틱 풍경",
    category: "장르",
    genre: "cinematic ambient",
    mood: "expansive, hopeful",
    instruments: "strings, piano, atmospheric pads",
    bpm: 68,
    description: "영상의 장면을 넓히는 배경 음악",
  },
  {
    name: "신스 레트로",
    category: "장르",
    genre: "synthwave",
    mood: "nostalgic, driving",
    instruments: "analog synth, gated drums, arpeggiator",
    bpm: 116,
    description: "복고 신스와 선명한 리듬",
  },
  {
    name: "흥겨운 트로트",
    category: "장르",
    genre: "modern trot",
    mood: "playful, celebratory",
    instruments: "brass, accordion, rhythmic drums",
    bpm: 126,
    description: "흥겨운 리듬과 쉬운 후렴",
  },
  {
    name: "포크 일기",
    category: "장르",
    genre: "folk",
    mood: "reflective, intimate",
    instruments: "fingerpicked guitar, harmonica",
    bpm: 80,
    description: "일상의 작은 장면을 노래로",
  },
  {
    name: "강렬한 랩",
    category: "장르",
    genre: "boom bap hip hop",
    mood: "confident, focused",
    instruments: "sampled drums, bass, sparse piano",
    bpm: 92,
    description: "자음과 리듬을 살리는 랩",
  },
  {
    name: "팝 댄스",
    category: "댄스",
    genre: "dance pop",
    mood: "bright, energetic",
    instruments: "synth bass, punchy drums, bright synth",
    bpm: 124,
    description: "명확한 훅과 대중적인 댄스 비트",
  },
  {
    name: "딥 하우스",
    category: "댄스",
    genre: "deep house",
    mood: "smooth, hypnotic",
    instruments: "four-on-the-floor kick, warm bass, chord stabs",
    bpm: 122,
    description: "일관된 4비트 그루브",
  },
  {
    name: "디스코 펑크",
    category: "댄스",
    genre: "disco funk",
    mood: "joyful, groovy",
    instruments: "slap bass, rhythm guitar, brass",
    bpm: 116,
    description: "펑키한 베이스와 리듬 기타",
  },
  {
    name: "라틴 그루브",
    category: "댄스",
    genre: "latin pop",
    mood: "festive, warm",
    instruments: "latin percussion, nylon guitar, bass",
    bpm: 104,
    description: "타악기의 경쾌한 리듬",
  },
  {
    name: "댄스홀",
    category: "댄스",
    genre: "dancehall",
    mood: "playful, rhythmic",
    instruments: "syncopated drums, sub bass, synth plucks",
    bpm: 100,
    description: "엇박자와 여유 있는 움직임",
  },
  {
    name: "드럼 앤 베이스",
    category: "댄스",
    genre: "liquid drum and bass",
    mood: "uplifting, flowing",
    instruments: "breakbeats, rolling bass, atmospheric pads",
    bpm: 172,
    description: "빠른 비트와 부드러운 패드",
  },
  {
    name: "퓨처 베이스",
    category: "댄스",
    genre: "future bass",
    mood: "euphoric, dreamy",
    instruments: "modulated synth chords, sub bass, electronic drums",
    bpm: 150,
    description: "리듬감 있는 코드와 드롭",
  },
  {
    name: "테크 하우스",
    category: "댄스",
    genre: "tech house",
    mood: "minimal, driving",
    instruments: "tight kick, bass groove, percussion",
    bpm: 128,
    description: "간결한 리듬 중심의 전개",
  },
];
export function recipe(b: Brief): string {
  const delivery = b.instrumental
    ? "instrumental, no vocals"
    : b.rapPct === 100
      ? "rap vocals from start to finish, rapped verses and rapped hook, rhythmic spoken delivery in every section"
      : b.rapPct >= 60
        ? "rap-led vocals, melodic sung hooks"
        : b.rapPct > 0
          ? "melodic vocals, rhythmic rap verses"
          : "melodic vocals";
  const voice =
    VOICE_TERMS[b.voice === "자연스러운 보컬" ? b.presetVoice : b.voice];
  return Array.from(
    new Set(
      [
        b.genre,
        b.era === "global"
          ? ""
          : b.era === "modern"
            ? "modern Korean pop production"
            : `${b.era} production aesthetics`,
        b.mood,
        b.instruments,
        b.bpmHint ? `${b.bpm} BPM` : "",
        delivery,
        b.instrumental ? "" : voice,
        !b.instrumental && b.differentRapVoice && b.rapPct > 0
          ? `separate rap performer, ${VOICE_TERMS[b.rapVoice]}`
          : "",
        !b.instrumental && b.highPitchRestraint
          ? "comfortable low-to-mid register, restrained high notes"
          : "",
        !b.instrumental && b.harmony
          ? b.rapPct === 100
            ? "layered rhythmic spoken backing"
            : "layered backing harmonies"
          : "",
        !b.instrumental && b.callResponse ? "call and response" : "",
      ].filter(Boolean),
    ),
  ).join(", ");
}
