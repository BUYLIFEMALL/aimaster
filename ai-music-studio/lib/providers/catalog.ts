// 음악 모델 목록 — 화면(모델 카드)과 서버(호출)가 함께 쓴다. 서버 전용 코드를 넣지 않는다.
// 가격은 2026-10-23 공개 가격표·중계 플랫폼 표기 기준의 「대략」 값이다(실제 청구는 각 플랫폼 기준). 근거: docs/analysis-music-studio-20261023/PLAN.md
// 새 모델을 넣을 때는 여기 한 줄 + lib/providers/adapters/<공급자>.ts 입력 변환만 고친다.

export type ProviderId = "gemini" | "elevenlabs" | "fal" | "replicate" | "suno";

export interface ProviderInfo {
  id: ProviderId;
  name: string;
  /** 공용 user_api_keys.provider 이름 — 한 번 등록하면 다른 프로그램도 같이 쓴다 */
  keyProvider: string;
  keyLabel: string;
  keyLink: string;
  placeholder: string;
  description: string;
  /** v1.03 실제 청구 확인용 플랫폼 사용량 페이지 */
  usageLink: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  gemini: {
    id: "gemini",
    usageLink: "https://aistudio.google.com/usage",
    name: "Google Gemini (Lyria)",
    keyProvider: "gemini",
    keyLabel: "Google Gemini API Key",
    keyLink: "https://aistudio.google.com/app/apikey",
    placeholder: "AIzaSy...",
    description: "Lyria 3.5(풀곡·보컬·가사)와 Lyria 3 Clip(30초)을 씁니다. AI 가사 쓰기에도 쓰입니다. 결제 등록된(유료 등급) 키가 필요합니다.",
  },
  elevenlabs: {
    id: "elevenlabs",
    usageLink: "https://elevenlabs.io/app/usage",
    name: "ElevenLabs Music",
    keyProvider: "elevenlabs",
    keyLabel: "ElevenLabs API Key",
    keyLink: "https://elevenlabs.io/app/settings/api-keys",
    placeholder: "sk_...",
    description: "Eleven Music v2.5로 최대 5분 곡을 만듭니다. 상업 이용은 ElevenLabs 유료 플랜(Starter 이상)이 필요합니다.",
  },
  suno: {
    id: "suno",
    usageLink: "https://sunoapi.org/ko/billing",
    name: "Suno (sunoapi.org)",
    keyProvider: "suno",
    keyLabel: "Suno API Key (api.sunoapi.org)",
    keyLink: "https://sunoapi.org/ko/api-key",
    placeholder: "sunoapi.org 키",
    description: "음악(SUNO)자동화와 같은 sunoapi.org 키로 Suno V6 곡을 만듭니다(한 번에 2곡). 크레딧은 sunoapi.org에서 충전합니다.",
  },
  fal: {
    id: "fal",
    usageLink: "https://fal.ai/dashboard/usage-billing",
    name: "fal.ai",
    keyProvider: "fal",
    keyLabel: "fal.ai API Key",
    keyLink: "https://fal.ai/dashboard/keys",
    placeholder: "fal 키 (id:secret)",
    description: "키 하나로 MiniMax Music 2.6·ACE-Step·Stable Audio 2.5를 씁니다.",
  },
  replicate: {
    id: "replicate",
    usageLink: "https://replicate.com/account/billing",
    name: "Replicate",
    keyProvider: "replicate",
    keyLabel: "Replicate API Token",
    keyLink: "https://replicate.com/account/api-tokens",
    placeholder: "r8_...",
    description: "AI 이미지 스튜디오와 같은 Replicate 토큰으로 MiniMax Music 2.5·Google Lyria 2·Stable Audio 2.5를 씁니다.",
  },
};

export interface MusicModel {
  /** 화면·DB에서 쓰는 고유 이름 */
  key: string;
  provider: ProviderId;
  /** 공급자 API에 보내는 모델 이름 */
  model: string;
  name: string;
  badge?: string;
  description: string;
  /** 보컬(노래) 생성 가능 */
  vocals: boolean;
  /** 보컬곡이면 가사가 꼭 필요한지(없으면 AI 가사 쓰기로 채우도록 안내) */
  lyricsRequired: boolean;
  /** 길이를 숫자로 정할 수 있는지(아니면 모델이 정함) */
  durationControl: boolean;
  minDurationS?: number;
  maxDurationS: number;
  defaultDurationS: number;
  /** 한 번에 나오는 곡 수 */
  outputs: number;
  costNote: string;
  /** 예상 비용(달러, 대략) */
  estCostUsd: (durationS: number) => number;
  commercial: string;
  /** v1.06 분위기 이미지로 작곡(최대 MAX_IMAGES장) */
  imageInput?: boolean;
  /** v1.06 WAV(고음질)로 받기 선택 */
  wavOutput?: boolean;
}

export const MODELS: MusicModel[] = [
  {
    key: "gemini:lyria-3.5",
    provider: "gemini",
    model: "lyria-3.5",
    name: "Google Lyria 3.5",
    badge: "추천 · 가성비",
    description: "보컬·가사·[Verse] 구조를 따르는 풀곡. 길이는 설명으로 지정됩니다.",
    vocals: true,
    lyricsRequired: false,
    durationControl: true,
    minDurationS: 30,
    maxDurationS: 180,
    defaultDurationS: 120,
    outputs: 1,
    costNote: "곡당 약 $0.08",
    estCostUsd: () => 0.08,
    commercial: "Gemini 유료 API 출력, SynthID 워터마크 포함",
    imageInput: true,
    wavOutput: true,
  },
  {
    key: "gemini:lyria-3-clip-preview",
    provider: "gemini",
    model: "lyria-3-clip-preview",
    name: "Google Lyria 3 Clip",
    description: "30초 짧은 클립. 쇼츠 배경음악·아이디어 시험용.",
    vocals: true,
    lyricsRequired: false,
    durationControl: false,
    maxDurationS: 30,
    defaultDurationS: 30,
    outputs: 1,
    costNote: "30초당 약 $0.04",
    estCostUsd: () => 0.04,
    commercial: "Gemini 유료 API 출력, SynthID 워터마크 포함",
  },
  {
    key: "elevenlabs:music_v2_5",
    provider: "elevenlabs",
    model: "music_v2_5",
    name: "ElevenLabs Music v2.5",
    badge: "상업 이용 명확",
    description: "최대 5분, 다국어 보컬. 연주곡 강제 선택 가능.",
    vocals: true,
    lyricsRequired: false,
    durationControl: true,
    minDurationS: 10,
    maxDurationS: 300,
    defaultDurationS: 120,
    outputs: 1,
    costNote: "1분당 약 $0.15",
    estCostUsd: (d) => Math.round(0.0025 * d * 100) / 100,
    commercial: "유료 플랜(Starter 이상)에서 대부분의 상업 용도 허용",
  },
  {
    key: "suno:V6",
    provider: "suno",
    model: "V6",
    name: "Suno V6",
    badge: "노래 품질",
    description: "표현력 있는 보컬과 풍부한 디테일. 한 번에 2곡, 길이는 모델이 정합니다.",
    vocals: true,
    lyricsRequired: true,
    durationControl: false,
    maxDurationS: 240,
    defaultDurationS: 180,
    outputs: 2,
    costNote: "2곡에 약 $0.06",
    estCostUsd: () => 0.06,
    commercial: "Suno 정책·sunoapi.org 약관을 따름",
  },
  {
    key: "suno:V6_WILD",
    provider: "suno",
    model: "V6_WILD",
    name: "Suno V6 Wild",
    badge: "실험적",
    description: "더 대담하고 실험적인 표현의 V6. 한 번에 2곡, 길이는 모델이 정합니다.",
    vocals: true,
    lyricsRequired: true,
    durationControl: false,
    maxDurationS: 240,
    defaultDurationS: 180,
    outputs: 2,
    costNote: "2곡에 약 $0.06",
    estCostUsd: () => 0.06,
    commercial: "Suno 정책·sunoapi.org 약관을 따름",
  },
  {
    key: "suno:V6_MINI",
    provider: "suno",
    model: "V6_MINI",
    name: "Suno V6 Mini",
    description: "가볍고 빠른 V6. 한 번에 2곡.",
    vocals: true,
    lyricsRequired: true,
    durationControl: false,
    maxDurationS: 240,
    defaultDurationS: 180,
    outputs: 2,
    costNote: "2곡에 약 $0.06",
    estCostUsd: () => 0.06,
    commercial: "Suno 정책·sunoapi.org 약관을 따름",
  },
  {
    key: "fal:fal-ai/minimax-music/v2.6",
    provider: "fal",
    model: "fal-ai/minimax-music/v2.6",
    name: "MiniMax Music 2.6 (fal)",
    description: "보컬·구조 태그 가사 지원. 가사를 비우면 설명으로 가사를 자동으로 씁니다.",
    vocals: true,
    lyricsRequired: false,
    durationControl: false,
    maxDurationS: 240,
    defaultDurationS: 180,
    outputs: 1,
    costNote: "곡당 약 $0.15",
    estCostUsd: () => 0.15,
    commercial: "MiniMax·fal 약관을 따름",
  },
  {
    key: "fal:fal-ai/ace-step",
    provider: "fal",
    model: "fal-ai/ace-step",
    name: "ACE-Step (fal)",
    badge: "최저가",
    description: "오픈소스 노래 모델. 아주 저렴하고 빠르며 길이를 정할 수 있습니다.",
    vocals: true,
    lyricsRequired: true,
    durationControl: true,
    minDurationS: 10,
    maxDurationS: 240,
    defaultDurationS: 60,
    outputs: 1,
    costNote: "1분당 약 $0.01",
    estCostUsd: (d) => Math.max(0.01, Math.round(0.0002 * d * 100) / 100),
    commercial: "ACE-Step 오픈소스(Apache 2.0)·fal 약관",
  },
  {
    key: "fal:fal-ai/stable-audio-25/text-to-audio",
    provider: "fal",
    model: "fal-ai/stable-audio-25/text-to-audio",
    name: "Stable Audio 2.5 (fal)",
    description: "연주곡·효과음 전용(가사 없음). 최대 약 3분.",
    vocals: false,
    lyricsRequired: false,
    durationControl: true,
    minDurationS: 10,
    maxDurationS: 190,
    defaultDurationS: 90,
    outputs: 1,
    costNote: "회당 약 $0.20",
    estCostUsd: () => 0.2,
    commercial: "Stability 커뮤니티 라이선스(연매출 100만 달러 미만)",
  },
  {
    key: "replicate:minimax/music-2.5",
    provider: "replicate",
    model: "minimax/music-2.5",
    name: "MiniMax Music 2.5 (Replicate)",
    description: "가사로 부르는 풀곡. 가사가 꼭 필요합니다(연주곡 불가).",
    vocals: true,
    lyricsRequired: true,
    durationControl: false,
    maxDurationS: 240,
    defaultDurationS: 180,
    outputs: 1,
    costNote: "곡당 약 $0.15",
    estCostUsd: () => 0.15,
    commercial: "MiniMax·Replicate 약관을 따름",
  },
  {
    key: "replicate:google/lyria-2",
    provider: "replicate",
    model: "google/lyria-2",
    name: "Google Lyria 2 (Replicate)",
    description: "48kHz 고음질 30초 연주곡.",
    vocals: false,
    lyricsRequired: false,
    durationControl: false,
    maxDurationS: 30,
    defaultDurationS: 30,
    outputs: 1,
    costNote: "30초당 약 $0.10",
    estCostUsd: () => 0.1,
    commercial: "Google·Replicate 약관, SynthID 워터마크",
  },
  {
    key: "replicate:stability-ai/stable-audio-2.5",
    provider: "replicate",
    model: "stability-ai/stable-audio-2.5",
    name: "Stable Audio 2.5 (Replicate)",
    description: "연주곡·효과음 전용(가사 없음). 길이를 정할 수 있습니다.",
    vocals: false,
    lyricsRequired: false,
    durationControl: true,
    minDurationS: 10,
    maxDurationS: 190,
    defaultDurationS: 90,
    outputs: 1,
    costNote: "회당 약 $0.20",
    estCostUsd: () => 0.2,
    commercial: "Stability 커뮤니티 라이선스(연매출 100만 달러 미만)",
  },
];

export const MAX_COMPARE = 3;
/** 요청 본문 한도(Vercel 4.5MB) 안에 맞추려고 공식 한도(10장)보다 적게 받는다 — 화면에서 1024px JPEG로 줄여 보냄 */
export const MAX_IMAGES = 4;

export interface InputImage {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  /** base64(접두어 없음) */
  data: string;
}

export function findModel(key: string): MusicModel | undefined {
  return MODELS.find((m) => m.key === key);
}

/** 요청 길이를 모델 범위로 맞춘다(길이를 정할 수 없는 모델은 기본값) */
export function clampDuration(model: MusicModel, durationS: number | null | undefined): number {
  if (!model.durationControl) return model.defaultDurationS;
  const n = typeof durationS === "number" && Number.isFinite(durationS) ? Math.round(durationS) : model.defaultDurationS;
  return Math.min(model.maxDurationS, Math.max(model.minDurationS ?? 10, n));
}

export interface GenerationInput {
  prompt: string;
  title: string;
  lyrics: string;
  instrumental: boolean;
  durationS: number;
  language: string;
  /** v1.06 Lyria 3.5 전용 — 저장하지 않고 생성 요청에만 씀 */
  images?: InputImage[];
  /** v1.06 Lyria 3.5 전용 */
  format?: "mp3" | "wav";
}

/** 이 모델로 보낼 수 있는 입력인지(안 되면 회원에게 보여 줄 이유) */
export function validateForModel(model: MusicModel, input: Pick<GenerationInput, "instrumental" | "lyrics">): string | null {
  if (!model.vocals && !input.instrumental) return `${model.name}은(는) 연주곡 전용입니다. 「연주곡」을 고르거나 다른 모델을 골라 주세요.`;
  if (model.vocals && !input.instrumental && model.lyricsRequired && !input.lyrics.trim()) {
    if (model.key === "replicate:minimax/music-2.5") return `${model.name}은(는) 가사가 꼭 필요합니다. 가사를 쓰거나 「AI 가사 쓰기」를 눌러 주세요.`;
    return `${model.name} 보컬곡은 가사가 필요합니다. 가사를 쓰거나 「AI 가사 쓰기」를 눌러 주세요.`;
  }
  if (model.key === "replicate:minimax/music-2.5" && input.instrumental) return `${model.name}은(는) 연주곡을 만들 수 없습니다.`;
  return null;
}
