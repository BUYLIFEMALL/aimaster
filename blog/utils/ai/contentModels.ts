// 본문(콘텐츠) 생성 모델과 이미지 생성 모델 목록 — 서버/클라이언트 공용 상수.
// 네이버 블로그 SEO 스튜디오(naver-blog-seo-studio/lib/ai/contentModels.ts, openaiModels.ts, geminiModels.ts)와
// 같은 목록·같은 화면 구성으로 맞췄다(2026-10-01 주인님 지시: "콘텐츠 생성 모델과 이미지 생성 모델을 분리해서 같은 레이아웃으로").

export const CONTENT_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const
export type ContentProvider = (typeof CONTENT_PROVIDERS)[number]

export const CONTENT_PROVIDER_LABELS: Record<ContentProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
}

export type ContentModelOption = { value: string; label: string; provider: ContentProvider }

export const CONTENT_MODEL_OPTIONS: ContentModelOption[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o mini · 빠르고 경제적인 기본 모델', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o · 균형 잡힌 글쓰기', provider: 'openai' },
  { value: 'gpt-4.1', label: 'GPT-4.1 · 긴 문맥과 지시사항에 강함', provider: 'openai' },
  { value: 'gpt-5', label: 'GPT-5 · 고품질 콘텐츠 생성', provider: 'openai' },
  { value: 'gpt-5.6-luna', label: 'GPT-5.6 Luna · 빠르고 저렴한 최신 모델', provider: 'openai' },
  { value: 'gpt-5.6-terra', label: 'GPT-5.6 Terra · 성능과 비용의 균형', provider: 'openai' },
  { value: 'gpt-5.6-sol', label: 'GPT-5.6 Sol · 복잡한 콘텐츠에 강한 고급 모델', provider: 'openai' },
  { value: 'gpt-6-astra', label: 'GPT-6 Astra · 최고 성능 플래그십 모델', provider: 'openai' },
  { value: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 · 빠르고 경제적인 기본 모델', provider: 'anthropic' },
  { value: 'claude-sonnet-5', label: 'Claude Sonnet 5 · 자연스러운 장문 콘텐츠', provider: 'anthropic' },
  { value: 'claude-opus-5', label: 'Claude Opus 5 · 복잡한 맥락과 고품질 글', provider: 'anthropic' },
  // BLOG가 예전부터 쓰던 Gemini 본문 모델을 Gemini 기본값으로 둔다(기존 결과와 같은 품질 유지).
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash · 기존 BLOG 기본 모델', provider: 'gemini' },
  { value: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite · 빠르고 경제적인 모델', provider: 'gemini' },
  { value: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash · 속도와 품질의 균형', provider: 'gemini' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro · 깊이 있는 분석과 장문', provider: 'gemini' },
  { value: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro Preview · 고품질 콘텐츠', provider: 'gemini' },
]

/** 처음 화면을 열면 Gemini가 선택된다 — 예전 BLOG는 Gemini로만 생성했고, 이미지에도 Gemini 키가 필요해 키 하나로 시작할 수 있다. */
export const DEFAULT_CONTENT_PROVIDER: ContentProvider = 'gemini'

export function isContentProvider(value: unknown): value is ContentProvider {
  return CONTENT_PROVIDERS.some((provider) => provider === value)
}

export function getContentModels(provider: ContentProvider) {
  return CONTENT_MODEL_OPTIONS.filter((model) => model.provider === provider)
}

export function getDefaultContentModel(provider: ContentProvider) {
  if (provider === 'openai') return 'gpt-4.1'
  return getContentModels(provider)[0].value
}

export function resolveContentModel(provider: ContentProvider, value: unknown): string {
  return getContentModels(provider).some((model) => model.value === value) ? String(value) : getDefaultContentModel(provider)
}

// 이미지 생성은 현재 Google Gemini(나노바나나)만 지원한다. 값은 utils/news/nanoBananaConfig.ts의 키와 같다.
export const IMAGE_PROVIDER_LABEL = 'Google Gemini (나노바나나)'

export const IMAGE_MODEL_OPTIONS = [
  { value: 'nanobanana-2-2k', label: 'NanoBanana 2 · 2K 고화질 (추천)' },
  { value: 'nanobanana-2-4k', label: 'NanoBanana 2 · 4K 초고화질' },
  { value: 'nanobanana-pro', label: 'NanoBanana Pro · 4K 최고 품질' },
  { value: 'nanobanana', label: 'NanoBanana Standard · 1K 빠른 생성' },
] as const

export const DEFAULT_IMAGE_MODEL = 'nanobanana-2-2k'

export function resolveImageModel(value: unknown): string {
  return IMAGE_MODEL_OPTIONS.some((model) => model.value === value) ? String(value) : DEFAULT_IMAGE_MODEL
}
