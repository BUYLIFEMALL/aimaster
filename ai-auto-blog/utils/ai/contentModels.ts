// 본문(추론·글쓰기) 생성 모델과 이미지 생성 모델 레지스트리 — 서버/클라이언트 공용 상수.
// 기준 문서: docs/AI_MODEL_INTEGRATION_STANDARD.md (모델 ID 추측 금지, Preview는 표시하고 기본값 금지,
// 설명에는 용도만 적고 가격·속도·성능을 단정하지 않는다, 본문 모델과 이미지 모델은 따로 관리).
// 2026-10-01: 각 공급사 모델 목록 API(OpenAI /v1/models, Anthropic /v1/models, Gemini models.list)로
// 아래 ID가 실제로 존재하는지 테스트 회원 키로 확인했다. 모델을 추가할 때도 같은 방식으로 먼저 확인할 것.

export const CONTENT_PROVIDERS = ['openai', 'anthropic', 'gemini'] as const
export type ContentProvider = (typeof CONTENT_PROVIDERS)[number]

export const CONTENT_PROVIDER_LABELS: Record<ContentProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic Claude',
  gemini: 'Google Gemini',
}

export type ModelLifecycle = 'stable' | 'preview'
export type ModelEndpoint = 'chat-completions' | 'responses' | 'messages' | 'generate-content'

export type ContentModelOption = {
  provider: ContentProvider
  value: string
  /** 화면 제목에 쓰는 모델 이름 */
  name: string
  /** 선택 목록에 붙는 용도 설명 */
  purpose: string
  category: 'reasoning' | 'text'
  lifecycle: ModelLifecycle
  endpoint: ModelEndpoint
}

export const CONTENT_MODEL_OPTIONS: ContentModelOption[] = [
  // OpenAI — GPT-6 계열은 Chat Completions에서 거절되면 Responses API로 다시 보낸다(utils/ai/contentJson.ts).
  { provider: 'openai', value: 'gpt-4.1', name: 'GPT-4.1', purpose: '긴 지시사항을 따르는 블로그 원문 (기본)', category: 'text', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-4o-mini', name: 'GPT-4o mini', purpose: '짧은 글·가벼운 작업', category: 'text', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-4o', name: 'GPT-4o', purpose: '일반 블로그 글', category: 'text', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-5', name: 'GPT-5', purpose: '추론형 장문 글', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-5.6-luna', name: 'GPT-5.6 Luna', purpose: '추론형 · 가벼운 작업', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-5.6-terra', name: 'GPT-5.6 Terra', purpose: '추론형 · 일반 장문', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-5.6-sol', name: 'GPT-5.6 Sol', purpose: '추론형 · 복잡한 주제', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-6-luna', name: 'GPT-6 Luna', purpose: '추론형 · 가벼운 작업', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', purpose: '추론형 · 복잡한 주제', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },
  { provider: 'openai', value: 'gpt-6-astra', name: 'GPT-6 Astra', purpose: '추론형 · 최상위 품질이 필요한 글', category: 'reasoning', lifecycle: 'stable', endpoint: 'chat-completions' },

  // Anthropic Claude — Haiku 4.5는 모델 목록에 날짜가 붙은 정확한 ID로만 나와서 그 ID를 쓴다.
  { provider: 'anthropic', value: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', purpose: '짧은 글·가벼운 작업 (기본)', category: 'text', lifecycle: 'stable', endpoint: 'messages' },
  { provider: 'anthropic', value: 'claude-sonnet-5', name: 'Claude Sonnet 5', purpose: '자연스러운 장문', category: 'text', lifecycle: 'stable', endpoint: 'messages' },
  { provider: 'anthropic', value: 'claude-opus-5', name: 'Claude Opus 5', purpose: '복잡한 맥락의 장문', category: 'reasoning', lifecycle: 'stable', endpoint: 'messages' },
  { provider: 'anthropic', value: 'claude-fable-5', name: 'Claude Fable 5', purpose: '최상위 품질이 필요한 장문', category: 'reasoning', lifecycle: 'stable', endpoint: 'messages' },

  // Google Gemini
  { provider: 'gemini', value: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', purpose: '일반 블로그 글 (기본)', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite', purpose: '짧은 글·가벼운 작업', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', purpose: '일반 블로그 글', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', purpose: '일반 블로그 글', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', purpose: '일반 블로그 글 · 최신 Flash', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', purpose: '예전 BLOG 기본 모델', category: 'text', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', purpose: '깊이 있는 분석형 장문', category: 'reasoning', lifecycle: 'stable', endpoint: 'generate-content' },
  { provider: 'gemini', value: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', purpose: '분석형 장문 · 미리보기 모델', category: 'reasoning', lifecycle: 'preview', endpoint: 'generate-content' },
]

/** 선택 목록에 보이는 문구: "모델 이름 · 용도" */
export function contentModelLabel(model: ContentModelOption) {
  return `${model.name} · ${model.purpose}`
}

/** 처음 화면을 열면 OpenAI GPT-4.1이 선택된다(2026-10-01 주인님 지시). 회원이 고른 값은 브라우저에 기억돼 다음에도 그대로 쓴다. */
export const DEFAULT_CONTENT_PROVIDER: ContentProvider = 'openai'

/** 플랫폼을 바꾸면 그 플랫폼의 이 모델로 즉시 바뀐다(Preview 모델은 기본값으로 쓰지 않는다). */
const DEFAULT_MODEL_BY_PROVIDER: Record<ContentProvider, string> = {
  openai: 'gpt-4.1',
  anthropic: 'claude-haiku-4-5-20251001',
  gemini: 'gemini-3.5-flash',
}

export function isContentProvider(value: unknown): value is ContentProvider {
  return CONTENT_PROVIDERS.some((provider) => provider === value)
}

export function getContentModels(provider: ContentProvider) {
  return CONTENT_MODEL_OPTIONS.filter((model) => model.provider === provider)
}

export function getDefaultContentModel(provider: ContentProvider) {
  return DEFAULT_MODEL_BY_PROVIDER[provider]
}

export function findContentModel(value: unknown) {
  return CONTENT_MODEL_OPTIONS.find((model) => model.value === value)
}

export function resolveContentModel(provider: ContentProvider, value: unknown): string {
  return getContentModels(provider).some((model) => model.value === value) ? String(value) : getDefaultContentModel(provider)
}

// 이미지 생성은 현재 Google Gemini(나노바나나)만 지원한다. 값은 utils/news/nanoBananaConfig.ts의 키와 같다.
export const IMAGE_PROVIDER_LABEL = 'Google Gemini (나노바나나)'

export type ImageModelOption = {
  value: string
  name: string
  purpose: string
  category: 'image'
  lifecycle: ModelLifecycle
  endpoint: 'generate-content'
}

// 해상도 낮은 순서로 둔다(2026-10-01 주인님 지시: 1K를 2K 위로). 기본값은 NanoBanana 2 · 2K.
export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { value: 'nanobanana', name: 'NanoBanana Standard · 1K', purpose: '빠른 확인용', category: 'image', lifecycle: 'stable', endpoint: 'generate-content' },
  { value: 'nanobanana-2-2k', name: 'NanoBanana 2 · 2K', purpose: '고화질 (기본·추천)', category: 'image', lifecycle: 'stable', endpoint: 'generate-content' },
  { value: 'nanobanana-2-4k', name: 'NanoBanana 2 · 4K', purpose: '초고화질', category: 'image', lifecycle: 'stable', endpoint: 'generate-content' },
  { value: 'nanobanana-pro', name: 'NanoBanana Pro · 4K', purpose: '최고 품질', category: 'image', lifecycle: 'stable', endpoint: 'generate-content' },
]

export function imageModelLabel(model: ImageModelOption) {
  return `${model.name} · ${model.purpose}`
}

export const DEFAULT_IMAGE_MODEL = 'nanobanana-2-2k'

export function findImageModel(value: unknown) {
  return IMAGE_MODEL_OPTIONS.find((model) => model.value === value)
}

export function resolveImageModel(value: unknown): string {
  return IMAGE_MODEL_OPTIONS.some((model) => model.value === value) ? String(value) : DEFAULT_IMAGE_MODEL
}

// 글 이미지 장수(2026-10-01 주인님 지시): 1번은 글 전체를 대표하는 제목용 이미지, 나머지는 문단 4개를 나눠 맡는다
// (앞 문단에만 몰리지 않게 — utils/news/generator.ts groupParagraphs).
export const MIN_IMAGE_COUNT = 1
export const MAX_IMAGE_COUNT = 5
export const DEFAULT_IMAGE_COUNT = 3
export const IMAGE_COUNT_OPTIONS = [
  { value: 1, label: '1장 · 제목용(전체 내용 대표)' },
  { value: 2, label: '2장 · 제목용 + 본문 전체(문단 1~4) 1장' },
  { value: 3, label: '3장 · 제목용 + 문단 1~2 / 문단 3~4 (기본)' },
  { value: 4, label: '4장 · 제목용 + 문단 1~2 / 문단 3 / 문단 4' },
  { value: 5, label: '5장 · 제목용 + 문단 1 / 2 / 3 / 4 (문단마다 1장)' },
] as const

export function resolveImageCount(value: unknown): number {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_IMAGE_COUNT, Math.max(MIN_IMAGE_COUNT, n)) : DEFAULT_IMAGE_COUNT
}
