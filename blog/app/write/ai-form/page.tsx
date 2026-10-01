'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import {
  CONTENT_PROVIDER_LABELS,
  CONTENT_PROVIDERS,
  DEFAULT_CONTENT_PROVIDER,
  DEFAULT_IMAGE_MODEL,
  IMAGE_MODEL_OPTIONS,
  IMAGE_PROVIDER_LABEL,
  getContentModels,
  getDefaultContentModel,
  isContentProvider,
  resolveContentModel,
  resolveImageModel,
  type ContentProvider,
} from '@/blog/utils/ai/contentModels'

interface CategoryOption {
  id: number
  name: string
  slug: string
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: 1, name: '아키텍처', slug: 'architecture' },
  { id: 2, name: 'React', slug: 'react' },
  { id: 3, name: 'Rust', slug: 'rust' },
  { id: 4, name: 'DevOps', slug: 'devops' },
  { id: 5, name: 'Kubernetes', slug: 'kubernetes' },
  { id: 6, name: 'TypeScript', slug: 'typescript' },
  { id: 7, name: '성능', slug: 'performance' },
  { id: 8, name: 'JavaScript', slug: 'javascript' },
  { id: 9, name: 'Go', slug: 'go' },
  { id: 10, name: 'Docker', slug: 'docker' },
  { id: 11, name: '데이터베이스', slug: 'database' },
  { id: 12, name: '보안', slug: 'security' },
]

const SUGGESTED_TOPICS = [
  'AI 콘텐츠 자동화의 미래',
  'SaaS 성장 전략 가이드',
  '스타트업 마케팅 실전 노하우',
  '개인 브랜딩으로 커리어 성장하기',
  '원격 근무 생산성 높이는 법',
  '2026 SEO 완벽 가이드',
]

const TONE_OPTIONS = ['전문적', '친근함', '설득력있는', '격식있는', '위트있는']

// 모델 선택지 — 사용 가능 목록·기본값은 utils/ai/contentModels.ts 한 곳에서 관리(SEO 스튜디오와 같은 목록).
const MODEL_STORAGE_KEY = 'ai-auto-blog:model-selection'

export default function AiFormPage() {
  return (
    <Suspense fallback={null}>
      <AiFormPageInner />
    </Suspense>
  )
}

function AiFormPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase, setSupabase] = useState<any>(null)
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient())
      setBasePath(getBlogBasePath())
    }
  }, [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>(DEFAULT_CATEGORIES)

  // 폼 입력 상태 (복수 카테고리 지원)
  const [categorySlugs, setCategorySlugs] = useState<string[]>(['architecture'])
  // /candidates(게시글 주제 수집)에서 "이 주제로 글쓰기"로 넘어온 경우 topic/keywords를 미리 채운다.
  const [topic, setTopic] = useState(() => searchParams.get('topic') ?? '')
  const [tone, setTone] = useState('전문적')
  const [targetAudience, setTargetAudience] = useState('')
  const [targetWordCount, setTargetWordCount] = useState(1000)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(() => {
    const raw = searchParams.get('keywords')
    return raw ? raw.split(',').map((k) => k.trim()).filter(Boolean) : []
  })
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['', '', ''])
  
  // 나노바나나 AI 이미지 설정 상태
  const [nanoBananaApiKey, setNanoBananaApiKey] = useState('')
  const [imageModel, setImageModel] = useState<string>(DEFAULT_IMAGE_MODEL)
  // 본문 생성 플랫폼·모델 (SEO 스튜디오와 같은 선택지)
  const [contentProvider, setContentProvider] = useState<ContentProvider>(DEFAULT_CONTENT_PROVIDER)
  const [contentModel, setContentModel] = useState<string>(getDefaultContentModel(DEFAULT_CONTENT_PROVIDER))

  // 마지막으로 고른 모델을 이 브라우저에 기억한다(편의용, 실패해도 기본값으로 동작).
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_STORAGE_KEY) ?? 'null') as { contentProvider?: unknown; contentModel?: unknown; imageModel?: unknown } | null
      if (saved && isContentProvider(saved.contentProvider)) {
        setContentProvider(saved.contentProvider)
        setContentModel(resolveContentModel(saved.contentProvider, saved.contentModel))
      }
      if (saved?.imageModel) setImageModel(resolveImageModel(saved.imageModel))
    } catch {}
  }, [])
  useEffect(() => {
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify({ contentProvider, contentModel, imageModel }))
    } catch {}
  }, [contentProvider, contentModel, imageModel])
  const [nanoBananaEndpoint, setNanoBananaEndpoint] = useState('')

  // 추천 링크 (CTA) 및 추가 지시사항
  const [ctaText, setCtaText] = useState('추천링크')
  const [ctaUrl, setCtaUrl] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }: any) => {
      setUserEmail(data?.user?.email ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUserEmail(session?.user?.email ?? null)
    })

    // DB에서 카테고리 목록 동적 로드
    supabase
      .from('blog_categories')
      .select('id, name, slug')
      .order('id', { ascending: true })
      .then(({ data, error }: any) => {
        if (!error && data && data.length > 0) {
          setCategories(data)
          // 첫 접속 시 데이터베이스의 첫번째 카테고리가 포함되도록 기본값 갱신
          setCategorySlugs((prev) => (prev.length === 0 ? [data[0].slug] : prev))
        }
      })

    return () => {
      listener?.subscription.unsubscribe()
    }
  }, [supabase])

  const handleToggleCategory = (slug: string) => {
    setCategorySlugs((prev) => {
      if (prev.includes(slug)) {
        // 최소 1개 카테고리는 항상 선택 상태 유지
        if (prev.length <= 1) return prev
        return prev.filter((s) => s !== slug)
      } else {
        return [...prev, slug]
      }
    })
  }

  const handleAddKeyword = (kw: string) => {
    const trimmed = kw.trim()
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords((prev) => [...prev, trimmed])
    }
    setKeywordInput('')
  }

  const handleRemoveKeyword = (targetKw: string) => {
    setKeywords((prev) => prev.filter((k) => k !== targetKw))
  }

  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddKeyword(keywordInput)
    }
  }

  const handleUrlChange = (index: number, val: string) => {
    setReferenceUrls((prev) => {
      const copy = [...prev]
      copy[index] = val
      return copy
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      alert('⚠️ 블로그 주제를 입력해주세요!\n(상단의 [추천 예시 주제] 칩 버튼을 클릭하시면 간편하게 선택하실 수 있습니다.)')
      return
    }

    try {
      setLoading(true)
      setStatusMsg('AI 인공지능 모델이 트렌드를 분석하고 AI자동 블로그 및 본문 내용을 토대로 3개의 AI이미지를 생성 중입니다...')

      const validUrls = referenceUrls.map((u) => u.trim()).filter((u) => u.length > 0)

      const payload = {
        topic: topic.trim(),
        category_slugs: categorySlugs,
        category_slug: categorySlugs[0],
        tone,
        target_audience: targetAudience.trim() || undefined,
        target_word_count: targetWordCount,
        keywords,
        reference_urls: validUrls,
        nanoBananaApiKey: nanoBananaApiKey.trim() || undefined,
        contentProvider,
        contentModel,
        imageModel,
        nanoBananaEndpoint: nanoBananaEndpoint.trim() || undefined,
        cta: (ctaText.trim() || ctaUrl.trim()) ? {
          text: ctaText.trim() || '자세히 보기',
          url: ctaUrl.trim() || '#',
        } : undefined,
        custom_prompt: customPrompt.trim() || undefined,
      }

      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (data.code === 'API_KEY_REQUIRED') {
        if (window.confirm(`${data.error}\n\n지금 설정 페이지로 이동할까요?`)) {
          router.push(`${getBlogBasePath()}/settings`)
        }
        return
      }
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'AI 포스팅 생성에 실패했습니다.')
      }

      const createdId = data.data?.postId || data.postId
      if (createdId) {
        router.push(`${getBlogBasePath()}/posts/${createdId}`)
      } else {
        router.push(getBlogBasePath() || '/')
      }
    } catch (err: any) {
      console.error('[AI Form Error]:', err)
      alert(err.message || 'AI 글 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setStatusMsg(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans ai-form-container">
      {/* 메인 폼 */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <form onSubmit={handleSubmit} autoComplete="off" className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl space-y-8">
          {/* 타이틀 헤더 */}
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">AI 맞춤 자동 글쓰기</h1>
            <p className="text-sm font-medium text-slate-500">카테고리(복수선택), 주제, AI 이미지 설정 및 추천링크를 지정하시면 최적의 SEO 포스팅이 자동 생성됩니다.</p>
          </div>

          {/* [상단] 1. 카테고리 복수 선택 섹션 */}
          <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <span className="text-base">📁</span>
                <span>포스팅 카테고리 선택 (복수 선택 가능)</span>
              </label>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                {categorySlugs.length}개 선택됨
              </span>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {categories.map((cat) => {
                const isSelected = categorySlugs.includes(cat.slug)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.slug)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                        : 'bg-white text-slate-700 hover:bg-blue-50 border border-slate-200'
                    }`}
                  >
                    {isSelected && <span className="text-[10px]">✓</span>}
                    <span>{cat.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. 주제 및 추천 키워드 입력 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>✏️</span>
                <span>블로그 주제 (필수)</span>
              </label>
              <textarea
                rows={3}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="블로그 주제를 입력하세요 (예: 초보자를 위한 블로그 자동화 구축 가이드)"
                style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                className="w-full p-4 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors resize-none text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
              />
            </div>

            {/* 추천 주제 칩 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <span>💡</span> 추천 예시 주제
              </label>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {SUGGESTED_TOPICS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTopic(item)}
                    className="px-3 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 transition-colors cursor-pointer"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. 세부 옵션 설정 섹션 */}
          <div className="pt-4 border-t border-slate-100 space-y-6">
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <span>⚙️</span> 세부 옵션 설정
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 글 분위기 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">글 분위기 (Tone)</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black bg-white shadow-sm"
                >
                  {TONE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 대상 독자 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">대상 독자</label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="어떤 독자를 위한 글인지 입력하세요 (선택)"
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>

            {/* 분량 선택 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>원하는 분량 (단어 수)</span>
                <span className="text-indigo-600">{targetWordCount.toLocaleString()} 단어</span>
              </div>
              <input
                type="range"
                min={500}
                max={2000}
                step={250}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[11px] text-slate-400 font-medium pt-1">
                <span>500 (간결함)</span>
                <span>1,000 (표준)</span>
                <span>2,000 (상세 가이드)</span>
              </div>
            </div>

            {/* 검색 키워드 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">검색 키워드 (SEO Keywords)</label>
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                placeholder="키워드 입력 후 Enter (선택)"
                style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                className="w-full p-3.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
              />
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-indigo-400 hover:text-indigo-800 font-bold text-xs"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 참고 웹페이지 링크 */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>참고 웹페이지 링크 (Reference URLs)</span>
                <span className="text-slate-400 font-normal">최대 3개</span>
              </div>
              <div className="space-y-2">
                {referenceUrls.map((url, idx) => (
                  <input
                    key={idx}
                    type="text"
                    name={`ref_no_autofill_${idx + 1}`}
                    autoComplete="new-password"
                    value={url}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    placeholder={`https://example.com/reference-${idx + 1}`}
                    style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                    className="w-full p-3.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 4. 본문 생성 설정 · 이미지 생성 설정 — 네이버 블로그 SEO 스튜디오의 "본문 생성 설정" 카드와 같은 레이아웃(2026-10-01) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3" aria-label="본문 생성 모델 선택">
            <div>
              <p className="text-sm font-extrabold text-slate-900">본문 생성 설정 · {CONTENT_PROVIDER_LABELS[contentProvider]}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">아래 생성 버튼을 누를 때 제목과 블로그(원문) 본문에 적용됩니다.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="space-y-1.5">
                <label htmlFor="content-provider-selector" className="text-xs font-bold text-slate-700">본문 생성 플랫폼</label>
                <select
                  id="content-provider-selector"
                  value={contentProvider}
                  onChange={(e) => {
                    const provider = e.target.value as ContentProvider
                    setContentProvider(provider)
                    setContentModel(getDefaultContentModel(provider))
                  }}
                  disabled={loading}
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black bg-white shadow-sm"
                >
                  {CONTENT_PROVIDERS.map((provider) => (
                    <option key={provider} value={provider} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                      {CONTENT_PROVIDER_LABELS[provider]}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">선택한 플랫폼에 등록한 본인 API 키만 사용합니다.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="content-model-selector" className="text-xs font-bold text-slate-700">본문 생성 모델</label>
                <select
                  id="content-model-selector"
                  value={contentModel}
                  onChange={(e) => setContentModel(e.target.value)}
                  disabled={loading}
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black bg-white shadow-sm"
                >
                  {getContentModels(contentProvider).map((m) => (
                    <option key={m.value} value={m.value} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">선택한 모델로 완성형 블로그(원문)를 생성합니다.</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3" aria-label="이미지 생성 모델 선택">
            <div>
              <p className="text-sm font-extrabold text-slate-900">이미지 생성 설정 · {IMAGE_PROVIDER_LABEL}</p>
              <p className="text-xs font-bold text-slate-700 mt-0.5">본문 섹션마다 핵심 문장 하나를 골라 그 문장을 표현한 실사 이미지 3장을 생성합니다.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-orange-100 bg-orange-50/40 p-4">
              <div className="space-y-1.5">
                <label htmlFor="image-provider-selector" className="text-xs font-bold text-slate-700">이미지 생성 플랫폼</label>
                <select
                  id="image-provider-selector"
                  value="gemini"
                  disabled
                  style={{ color: '#000000', backgroundColor: '#f8fafc', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl text-sm font-semibold text-black shadow-sm"
                >
                  <option value="gemini">{IMAGE_PROVIDER_LABEL}</option>
                </select>
                <p className="text-[11px] text-slate-500">설정에 등록한 본인 Google Gemini API 키만 사용합니다.</p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="image-model-selector" className="text-xs font-bold text-slate-700">이미지 생성 모델</label>
                <select
                  id="image-model-selector"
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  disabled={loading}
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black bg-white shadow-sm"
                >
                  {IMAGE_MODEL_OPTIONS.map((m) => (
                    <option key={m.value} value={m.value} style={{ color: '#000000', backgroundColor: '#ffffff' }}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">해상도가 높을수록 생성 시간과 비용이 늘어납니다.</p>
              </div>
            </div>

            <details className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <summary className="cursor-pointer text-xs font-bold text-slate-600">고급 설정 (선택) — 이번 글에만 쓸 키·엔드포인트</summary>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                {/* type="text" + WebkitTextSecurity: 브라우저의 비밀번호 저장/이메일 자동채움 방지 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Gemini API 키 (이번 글에만 사용)</label>
                  <input
                    type="text"
                    name="nb_api_key_field"
                    autoComplete="new-password"
                    value={nanoBananaApiKey}
                    onChange={(e) => setNanoBananaApiKey(e.target.value)}
                    placeholder="비워두면 설정에 등록된 내 키 사용"
                    style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', WebkitTextSecurity: 'disc' } as any}
                    className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black placeholder-slate-400 shadow-sm"
                  />
                  <p className="text-[11px] text-slate-500">
                    <Link href={`${basePath}/settings`} className="text-indigo-600 underline font-semibold">설정</Link>에서 키를 한 번 등록해두면 매번 입력하지 않아도 됩니다.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">커스텀 이미지 API 엔드포인트</label>
                  <input
                    type="url"
                    value={nanoBananaEndpoint}
                    onChange={(e) => setNanoBananaEndpoint(e.target.value)}
                    placeholder="https://generativelanguage.googleapis.com/v1beta/models/..."
                    style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                    className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black placeholder-slate-400 shadow-sm"
                  />
                </div>
              </div>
            </details>
          </section>

          {/* 5. 추천/홍보 링크 섹션 (CTA) */}
          <div className="space-y-3 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
            <label className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
              <span className="text-base">🔗</span>
              <span>하단 추천/홍보 링크 지정 (CTA - 행동 유도 버튼)</span>
            </label>
            <p className="text-xs text-indigo-700">글 하단에 본문과 어우러지는 추천 상품/서비스/자료 다운로드 링크 박스가 삽입됩니다.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">추천 버튼 문구</label>
                <input
                  type="text"
                  value={ctaText}
                  onChange={(e) => setCtaText(e.target.value)}
                  placeholder="예: 무료 전자책 가이드 다운로드"
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">추천 대상 URL</label>
                <input
                  type="url"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="https://example.com/offer"
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* 6. 추가 지시사항 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">추가 지시사항 (Custom Prompt)</label>
            <textarea
              rows={3}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="꼭 다뤄야 할 내용, 피해야 할 내용, 특정 브랜드/서비스 언급 등 (선택)"
              style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
              className="w-full p-4 rounded-xl focus:outline-none focus:border-indigo-600 transition-colors resize-none text-sm font-extrabold text-black placeholder-slate-400 shadow-sm"
            />
          </div>

          {/* 상태 메시지 */}
          {statusMsg && (
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-700 flex items-center gap-2 animate-pulse">
              <span className="text-base">🚀</span>
              <span>{statusMsg}</span>
            </div>
          )}

          {/* 제출 버튼 */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: '#2563eb', color: '#ffffff', border: 'none' }}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>AI 글 생성 및 분석 진행 중...</span>
                </>
              ) : (
                <span>✨ AI 글 생성 시작</span>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
