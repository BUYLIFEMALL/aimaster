// 콘텐츠 생성(v1.42)이 쓰는 상황별 페르소나·다시 써줘·AI 엔진 목록. 서버와 화면이 함께 읽는 값이라 "server-only"가 아니다.
// 페르소나 6종과 다시 써줘 7종은 `threads-easy-planner`(Threads AI 기획기)의 구성을 그대로 옮겼다.

export type Persona = { id: string; name: string; badge: string; emoji: string; tagline: string; tonePrompt: string; defaultTopic: string };

export const PERSONAS: Persona[] = [
  { id: "housewife", name: "가전·살림 주부형", badge: "살림 9단 꼼꼼 비교", emoji: "👩‍🍳", tagline: "실생활 가성비 & 살림 꿀팁 톤", tonePrompt: "살림 9단이자 가전·살림템에 진심인 30대 후반 주부의 시점. 깐깐하게 비교하고 실생활에서 삶의 질을 올려주는 관점으로, 친근하면서도 믿음직한 언니/동네 이웃 말투(반말).", defaultTopic: "살림 9단이 뽑은 삶의 질 수직상승 가전/살림 필수템" },
  { id: "single", name: "독신·자취생형", badge: "2030 자취 찐현실 썰", emoji: "🏠", tagline: "퇴근 후 귀차니즘 & 생존 꿀팁 톤", tonePrompt: "원룸 자취 4년 차, 퇴근하면 손 하나 까딱하기 싫은 20대 후반 독신 직장인의 시점. 설거지 극혐, 좁은 방 공간 활용, 배달비 아끼기 같은 솔직담백한 자취 말투(반말, ';;', 'ㅠㅠ').", defaultTopic: "퇴근 후 설거지하기 싫어서 안달 난 자취생의 인생템" },
  { id: "working_mom", name: "워킹맘·직장인형", badge: "퇴근길 지친 30대 공감", emoji: "💼", tagline: "시간 1초 아끼는 현실 피로 공감", tonePrompt: "회사 다니면서 육아와 살림까지 해내는 34세 워킹맘의 시점. 퇴근길 지하철에서 지친 몸으로 스레드를 보는 사람들에게 '나도 그래' 하며 위로하고 시간 절약 관점을 던지는 친한 언니 반말 톤.", defaultTopic: "퇴근하고 쓰러지기 일보 직전인 워킹맘의 시간 절약 꿀팁" },
  { id: "editor", name: "20대 쇼핑·뷰티 에디터형", badge: "감성 추천 & 종결템 썰", emoji: "💄", tagline: "비싼 건 줄 알았는데 가성비 종결템", tonePrompt: "트렌디한 20대 패션/뷰티 쇼핑 에디터의 시점. '이거 비싼 건 줄 알았는데;;', '이걸로 종결 땅땅!' 같은 찰진 스레드 감탄사 어조.", defaultTopic: "비싼 브랜드인 줄 알았는데 알고 보니 가성비 종결템이었던 썰" },
  { id: "tech", name: "IT·테크 리뷰어형", badge: "팩트 분석 & 스펙 비교", emoji: "⚡", tagline: "모르면 평생 손해 보는 논리 톤", tonePrompt: "IT 기기와 전자기기, 생산성 툴을 집요하게 파고드는 테크 리뷰어의 시점. 거품을 빼고 팩트 중심으로, '이 기능 모르면 평생 손해'라는 식의 핵심을 찌르는 반말 톤.", defaultTopic: "실사용 기준으로 결론 내린 가성비 전자기기 팩트 리뷰" },
  { id: "side_hustle", name: "N잡러·재테크 부업형", badge: "자본주의 현실 극복", emoji: "💰", tagline: "월 100 더 버는 현실 실행 톤", tonePrompt: "본업 외에 스마트스토어, 블로그, 제휴마케팅 등 추가 수입을 만들려는 30대 N잡러의 시점. 뜬구름 잡는 강의 팔이가 아닌 현실적인 돈 버는 이야기 톤.", defaultTopic: "통장 잔고 50만원에서 부업으로 월 100만원 파이프라인 만드는 현실 과정" },
];

export type RewriteMode = "provocative" | "natural" | "shorter" | "expert" | "funny" | "no_ad" | "hooks_only";

export const REWRITE_MODES: { mode: RewriteMode; label: string; icon: string; instruction: string }[] = [
  { mode: "provocative", label: "더 자극적으로", icon: "⚡", instruction: "더 자극적으로: 손해 회피와 부정 명령을 극대화하고, 궁금해서 안 읽고는 못 배기게 도발적인 톤으로 고쳐줘." },
  { mode: "natural", label: "더 자연스럽게", icon: "🌿", instruction: "더 자연스럽게: AI 냄새를 100% 제거하고, 친한 친구에게 카톡으로 털어놓듯 가장 편안하고 리얼한 구어체 반말로 고쳐줘." },
  { mode: "shorter", label: "더 짧게", icon: "✂️", instruction: "더 짧게: 사족을 전부 쳐내고 핵심만 3~4줄로 군더더기 없이 임팩트 있게 압축해줘." },
  { mode: "expert", label: "더 전문적으로", icon: "🎓", instruction: "더 전문적으로: 신뢰도 높은 인사이트와 설득력 있는 시각을 친근한 구어체 안에 담아 논리 정연하게 재구성해줘." },
  { mode: "funny", label: "더 웃기게", icon: "🤣", instruction: "더 웃기게: 피식 웃음이 나오는 위트, 자조적인 유머와 찰진 드립을 녹여내줘." },
  { mode: "no_ad", label: "광고 느낌 빼기", icon: "🚫", instruction: "광고 느낌 빼기: 제품명이나 홍보성 단어를 완전히 지우고, 담백하고 솔직한 이야기 느낌으로 바꿔줘." },
  { mode: "hooks_only", label: "후킹만 다시", icon: "🎣", instruction: "후킹 집중 개선: 본문 내용은 유지하되, 첫 문장 후킹(hook)을 1초 만에 뇌리에 꽂히는 문장으로 업그레이드해줘." },
];

// ----- 글 생성 AI 엔진 (threads-affiliate-poster의 GPT / Claude / Gemini 선택 방식) -----
export type EngineProvider = "openai" | "anthropic" | "gemini";
export const ENGINES: { provider: EngineProvider; label: string; sub: string; icon: string; models: { value: string; label: string }[] }[] = [
  { provider: "openai", label: "GPT", sub: "OpenAI", icon: "🤖", models: [
    { value: "gpt-4.1", label: "🚀 GPT-4.1 (최신 세대 스마트 모델 · 기본 추천)" },
    { value: "gpt-6-luna", label: "⚡ GPT-6 Luna (최신 세대 · 가성비 초고속)" },
    { value: "gpt-6-sol", label: "🎯 GPT-6 Sol (최신 세대 · 균형형)" },
    { value: "gpt-6-astra", label: "💎 GPT-6 Astra (최신 세대 · 최고 품질 플래그십)" },
    { value: "gpt-5.6-luna", label: "⚡ GPT-5.6 Luna (가성비 초고속)" },
    { value: "gpt-5.6-terra", label: "🎯 GPT-5.6 Terra (균형형 자연스러운 어조)" },
    { value: "gpt-5.6-sol", label: "💎 GPT-5.6 Sol (최고 품질 플래그십)" },
    { value: "gpt-4o", label: "⚙️ GPT-4o (범용 표준 모델)" },
    { value: "gpt-4o-mini", label: "⚡ GPT-4o-mini (빠르고 저렴)" },
  ] },
  { provider: "anthropic", label: "Claude", sub: "Anthropic", icon: "🧠", models: [
    { value: "claude-sonnet-5", label: "🎯 Claude Sonnet 5 (최신 세대 · 자연스러운 문체 · 기본 추천)" },
    { value: "claude-opus-5", label: "💎 Claude Opus 5 (고급형 복잡한 맥락 이해)" },
    { value: "claude-haiku-4-5", label: "⚡ Claude Haiku 4.5 (가성비 초고속)" },
  ] },
  { provider: "gemini", label: "Gemini", sub: "Google", icon: "✨", models: [
    { value: "gemini-3.7-flash", label: "⚡ Gemini 3.7 Flash (속도와 품질 균형 · 기본 추천)" },
    { value: "gemini-3.8-flash", label: "🚀 Gemini 3.8 Flash (최신 세대 · 최고 성능 Flash)" },
    { value: "gemini-3.5-flash-lite", label: "⚡ Gemini 3.5 Flash Lite (가장 빠르고 저렴)" },
    { value: "gemini-3.1-pro-preview", label: "💎 Gemini 3.1 Pro Preview (Google 최상위 플래그십)" },
    { value: "gemini-2.0-flash", label: "⚙️ Gemini 2.0 Flash (안정형)" },
  ] },
];
export const DEFAULT_ENGINE = { provider: "openai" as EngineProvider, model: "gpt-4.1" };

export function isKnownEngine(provider: string, model: string): provider is EngineProvider {
  return ENGINES.some((engine) => engine.provider === provider && engine.models.some((item) => item.value === model));
}

// ----- 이미지 생성 (4대 플랫폼: NanoBanana / GPT Image / FLUX 2.0 / Z-Image) -----
export type ImageRatio = "1:1" | "4:5" | "16:9" | "9:16";
export const IMAGE_RATIOS: { value: ImageRatio; label: string }[] = [
  { value: "1:1", label: "1:1 정사각형 (기본)" },
  { value: "4:5", label: "4:5 세로형" },
  { value: "16:9", label: "16:9 가로형" },
  { value: "9:16", label: "9:16 모바일 세로형" },
];

export type ImagePlatform = "nanobanana" | "openai" | "flux" | "zimage";
export type ImageKeyProvider = "gemini" | "openai" | "replicate";
export const IMAGE_PLATFORMS: { id: ImagePlatform; name: string; sub: string; icon: string; keyProvider: ImageKeyProvider }[] = [
  { id: "nanobanana", name: "NanoBanana", sub: "Google Gemini", icon: "🍌", keyProvider: "gemini" },
  { id: "openai", name: "GPT Image", sub: "OpenAI", icon: "🤖", keyProvider: "openai" },
  { id: "flux", name: "FLUX 2.0", sub: "Black Forest", icon: "⚡", keyProvider: "replicate" },
  { id: "zimage", name: "Z-Image", sub: "Alibaba 6B", icon: "🚀", keyProvider: "replicate" },
];
export const IMAGE_KEY_LABEL: Record<ImageKeyProvider, string> = { gemini: "Gemini", openai: "OpenAI", replicate: "Replicate" };

export const IMAGE_MODELS: { value: string; label: string; platform: ImagePlatform }[] = [
  { value: "nanobanana-2-2k", label: "NanoBanana 2-2K (고화질 시네마틱 · 기본 추천)", platform: "nanobanana" },
  { value: "nanobanana", label: "NanoBanana 2-1K (표준 경량 모델)", platform: "nanobanana" },
  { value: "nanobanana-2-4k", label: "NanoBanana 2-4K (울트라 HD)", platform: "nanobanana" },
  { value: "nanobanana-pro", label: "NanoBanana Pro (프로페셔널 정밀 비주얼)", platform: "nanobanana" },
  { value: "gpt-image-2", label: "GPT Image 2 (OpenAI 표준 비주얼 · 추천)", platform: "openai" },
  { value: "chatgpt-image-latest", label: "ChatGPT Image Latest (최신 통합 플래그십)", platform: "openai" },
  { value: "gpt-image-1.5", label: "GPT Image 1.5 (고성능)", platform: "openai" },
  { value: "gpt-image-1", label: "GPT Image 1 (표준 1세대)", platform: "openai" },
  { value: "gpt-image-1-mini", label: "GPT Image 1 Mini (초고속 경량 미니)", platform: "openai" },
  { value: "gpt-image-2.5-flare", label: "GPT Image 2.5 Flare (데일리 고품질)", platform: "openai" },
  { value: "gpt-image-2.5-sunburst", label: "GPT Image 2.5 Sunburst (최상위 플래그십)", platform: "openai" },
  { value: "black-forest-labs/flux-2-dev", label: "FLUX 2 [dev] (정밀 디테일 & 초고속 최적화 · 추천)", platform: "flux" },
  { value: "black-forest-labs/flux-2-pro", label: "FLUX 2 [pro] (상업용 극실사 고해상도)", platform: "flux" },
  { value: "black-forest-labs/flux-2-max", label: "FLUX 2 [max] (최대 해상도 플래그십)", platform: "flux" },
  { value: "prunaai/z-image-turbo", label: "Z-Image Turbo (Alibaba 6B 초고속 극실사 · 추천)", platform: "zimage" },
];
export const DEFAULT_IMAGE_PLATFORM: ImagePlatform = "nanobanana";
export const DEFAULT_IMAGE_MODELS: Record<ImagePlatform, string> = {
  nanobanana: "nanobanana-2-2k",
  openai: "gpt-image-2",
  flux: "black-forest-labs/flux-2-dev",
  zimage: "prunaai/z-image-turbo",
};
export const MAX_IMAGES_PER_POST = 10;
export const MAX_GENERATE_COUNT = 10;

export function findImageModel(value: string) {
  const model = IMAGE_MODELS.find((item) => item.value === value);
  if (!model) return undefined;
  const platform = IMAGE_PLATFORMS.find((item) => item.id === model.platform)!;
  return { ...model, keyProvider: platform.keyProvider };
}
export function isKnownRatio(value: string): value is ImageRatio {
  return IMAGE_RATIOS.some((item) => item.value === value);
}
