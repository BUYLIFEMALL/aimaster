'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  RefreshCw,
  Copy,
  Save,
  Send,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Plus,
  ExternalLink,
  Maximize2,
  X,
  ImageIcon,
  Layers,
  Eye,
  Download,
  Loader2,
  FileText,
  Clock,
  Tag,
  Link as LinkIcon,
  ChevronRight,
  Folder,
} from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import {
  CONTENT_PROVIDER_LABELS,
  CONTENT_PROVIDERS,
  DEFAULT_CONTENT_PROVIDER,
  DEFAULT_IMAGE_COUNT,
  DEFAULT_IMAGE_MODEL,
  IMAGE_COUNT_OPTIONS,
  IMAGE_MODEL_OPTIONS,
  IMAGE_PROVIDER_LABEL,
  contentModelLabel,
  findContentModel,
  findImageModel,
  getContentModels,
  imageModelLabel,
  getDefaultContentModel,
  isContentProvider,
  resolveContentModel,
  resolveImageCount,
  resolveImageModel,
  type ContentProvider,
} from '@/blog/utils/ai/contentModels'
import { ImageStorageNotice } from '@/blog/components/settings/ImageStorageNotice'

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

const MODEL_STORAGE_KEY = 'ai-auto-blog:model-selection'

function normalizeUrl(value: string): string {
  const v = value.trim()
  if (!v || v === '#') return v
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(v)) return v
  return 'https://' + v.replace(/^\/+/, '')
}

export interface PostSection {
  id: string
  heading: string
  body: string
  imageUrl?: string
}

export interface DraftResultData {
  title: string
  excerpt: string
  contentMarkdown: string
  contentHtml: string
  readingMinutes: number
  categorySlug: string
  topKeywords: string[]
  coverImage?: { url: string; caption?: string }
  sections: PostSection[]
  cta?: { text: string; url: string }
  hashtags?: string
}

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

  // 1. 폼 입력 상태
  const [categorySlugs, setCategorySlugs] = useState<string[]>(['architecture'])
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

  // AI 모델 설정 상태
  const [imageModel, setImageModel] = useState<string>(DEFAULT_IMAGE_MODEL)
  const [imageCount, setImageCount] = useState<number>(DEFAULT_IMAGE_COUNT)
  const [contentProvider, setContentProvider] = useState<ContentProvider>(DEFAULT_CONTENT_PROVIDER)
  const [contentModel, setContentModel] = useState<string>(getDefaultContentModel(DEFAULT_CONTENT_PROVIDER))

  // 마지막으로 고른 모델 기억
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_STORAGE_KEY) ?? 'null') as {
        contentProvider?: unknown
        contentModel?: unknown
        imageModel?: unknown
        imageCount?: unknown
      } | null
      if (saved && isContentProvider(saved.contentProvider)) {
        setContentProvider(saved.contentProvider)
        setContentModel(resolveContentModel(saved.contentProvider, saved.contentModel))
      }
      if (saved?.imageModel) setImageModel(resolveImageModel(saved.imageModel))
      if (saved?.imageCount) setImageCount(resolveImageCount(saved.imageCount))
    } catch {}
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        MODEL_STORAGE_KEY,
        JSON.stringify({ contentProvider, contentModel, imageModel, imageCount })
      )
    } catch {}
  }, [contentProvider, contentModel, imageModel, imageCount])

  // 추천 링크 (CTA) 및 추가 지시사항
  const [ctaText, setCtaText] = useState('추천링크')
  const [ctaUrl, setCtaUrl] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // 2. 실시간 검토 & 블록 편집기 상태
  const [draftResult, setDraftResult] = useState<DraftResultData | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftExcerpt, setDraftExcerpt] = useState('')
  const [draftCoverImage, setDraftCoverImage] = useState('')
  const [draftSections, setDraftSections] = useState<PostSection[]>([])
  const [draftCtaText, setDraftCtaText] = useState('')
  const [draftCtaUrl, setDraftCtaUrl] = useState('')
  const [draftHashtags, setDraftHashtags] = useState('')

  const [isSaving, setIsSaving] = useState(false)
  const [savedPostId, setSavedPostId] = useState<number | null>(null)
  const [regeneratingCover, setRegeneratingCover] = useState(false)
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null)
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null)
  const [handoffLoading, setHandoffLoading] = useState(false)

  const editorSectionRef = useRef<HTMLDivElement>(null)

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

  // 1단계 생성 요청 (미리보기 모드)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      alert('⚠️ 블로그 주제를 입력해주세요!\n(상단의 [추천 예시 주제] 칩 버튼을 클릭하시면 간편하게 선택하실 수 있습니다.)')
      return
    }

    try {
      setLoading(true)
      setStatusMsg(`AI 모델이 트렌드를 분석하고 본문 및 ${imageCount}장의 AI 이미지를 생성하고 있습니다...`)
      setSavedPostId(null)
      setHandoffStatus(null)

      const validUrls = referenceUrls.map((u) => normalizeUrl(u)).filter((u) => u.length > 0)

      const payload = {
        topic: topic.trim(),
        category_slugs: categorySlugs,
        category_slug: categorySlugs[0],
        tone,
        target_audience: targetAudience.trim() || undefined,
        target_word_count: targetWordCount,
        keywords,
        reference_urls: validUrls,
        contentProvider,
        contentModel,
        imageModel,
        imageCount,
        previewOnly: true, // DB 즉시 저장이 아닌 실시간 검토 & 편집 모드로 수신
        cta: ctaText.trim() || ctaUrl.trim()
          ? {
              text: ctaText.trim() || '자세히 보기',
              url: normalizeUrl(ctaUrl) || '#',
            }
          : undefined,
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

      const draft: DraftResultData = data.data
      setDraftResult(draft)
      setDraftTitle(draft.title || topic.trim())
      setDraftExcerpt(draft.excerpt || '')
      setDraftCoverImage(draft.coverImage?.url || '')
      setDraftSections(draft.sections && draft.sections.length > 0 ? draft.sections : [
        { id: 'sec-1', heading: '주요 개요 및 핵심 분석', body: draft.contentMarkdown || '' }
      ])
      setDraftCtaText(draft.cta?.text || ctaText || '자세히 보기')
      setDraftCtaUrl(draft.cta?.url || ctaUrl || '')
      setDraftHashtags(draft.hashtags || '')

      // 결과 편집 섹션으로 스크롤 이동
      setTimeout(() => {
        const el = document.getElementById('editor-section')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    } catch (err: any) {
      console.error('[AI Form Error]:', err)
      alert(err.message || 'AI 글 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
      setStatusMsg(null)
    }
  }

  // 문단 블록 편집 핸들러
  const handleUpdateSection = (id: string, field: 'heading' | 'body', value: string) => {
    setDraftSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, [field]: value } : sec))
    )
  }

  const handleMoveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= draftSections.length) return
    setDraftSections((prev) => {
      const copy = [...prev]
      const temp = copy[index]
      copy[index] = copy[target]
      copy[target] = temp
      return copy
    })
  }

  const handleDeleteSection = (id: string) => {
    if (draftSections.length <= 1) {
      alert('최소 1개의 문단은 유지되어야 합니다.')
      return
    }
    setDraftSections((prev) => prev.filter((sec) => sec.id !== id))
  }

  const handleAddSection = () => {
    const newId = 'sec-' + Date.now()
    setDraftSections((prev) => [
      ...prev,
      {
        id: newId,
        heading: `새 소제목 ${prev.length + 1}`,
        body: '새로운 문단 내용을 자유롭게 입력하세요.',
      },
    ])
  }

  const handleRemoveSectionImage = (id: string) => {
    setDraftSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, imageUrl: undefined } : sec))
    )
  }

  // 대표 이미지 다시 생성
  const handleRegenerateCoverImage = async () => {
    if (regeneratingCover) return
    setRegeneratingCover(true)
    try {
      const promptText = `${draftTitle || topic}, high quality blog main cover image, cinematic lighting, 8k resolution, photorealistic, no text`
      const res = await fetch('/api/posts/generate-editor-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || '이미지 생성 실패')
      setDraftCoverImage(data.url)
    } catch (err: any) {
      alert(err.message || '대표 이미지 재생성 중 오류가 발생했습니다.')
    } finally {
      setRegeneratingCover(false)
    }
  }

  // 문단 이미지 다시 생성
  const handleRegenerateSectionImage = async (sec: PostSection) => {
    if (regeneratingSectionId) return
    setRegeneratingSectionId(sec.id)
    try {
      const promptText = `${sec.heading}: ${sec.body.slice(0, 200)}, realistic detail, natural lighting, professional photography, no legible text`
      const res = await fetch('/api/posts/generate-editor-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || '이미지 생성 실패')
      setDraftSections((prev) =>
        prev.map((item) => (item.id === sec.id ? { ...item, imageUrl: data.url } : item))
      )
    } catch (err: any) {
      alert(err.message || '문단 이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setRegeneratingSectionId(null)
    }
  }

  // 현재 편집된 상태를 단일 마크다운으로 재조립
  const buildCurrentMarkdown = () => {
    const coverLine = draftCoverImage ? `![${draftTitle} 대표 비주얼](${draftCoverImage})` : ''
    const sectionsText = draftSections
      .map((sec) => {
        const imgLine = sec.imageUrl ? `![${sec.heading} 비주얼](${sec.imageUrl})` : ''
        return [`## ${sec.heading}`, imgLine, sec.body].filter(Boolean).join('\n\n')
      })
      .join('\n\n')

    const ctaBlock =
      draftCtaText && draftCtaUrl
        ? `---\n\n> [👉 ${draftCtaText} 바로가기](${normalizeUrl(draftCtaUrl)})\n`
        : ''

    const hashtagsBlock = draftHashtags ? `---\n\n${draftHashtags}` : ''

    return `
> ${draftExcerpt}

${coverLine}

${sectionsText}

${ctaBlock}

${hashtagsBlock}
`.trim()
  }

  // 최종 DB 저장
  const handleSaveFinalPost = async () => {
    if (!draftTitle.trim()) {
      alert('게시글 제목을 입력해주세요.')
      return
    }
    setIsSaving(true)
    try {
      const markdown = buildCurrentMarkdown()
      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveOnly: true,
          title: draftTitle.trim(),
          excerpt: draftExcerpt.trim(),
          contentMarkdown: markdown,
          category_slugs: categorySlugs,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '게시글 저장에 실패했습니다.')
      }

      const newPostId = data.data?.postId
      setSavedPostId(newPostId)
      if (
        window.confirm(
          '게시글이 성공적으로 등록되었습니다!\n\n작성된 게시글 상세 페이지로 지금 이동할까요?'
        )
      ) {
        router.push(`${getBlogBasePath()}/posts/${newPostId}`)
      }
    } catch (err: any) {
      alert(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 전체 복사
  const handleCopyContent = async () => {
    const markdown = buildCurrentMarkdown()
    const fullText = `${draftTitle}\n\n${markdown}`
    try {
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      alert('클립보드 복사에 실패했습니다.')
    }
  }

  // 네이버 입력기(Chrome 확장)로 전송
  const handleSendToExtension = async () => {
    let targetPostId = savedPostId
    if (!targetPostId) {
      if (
        window.confirm(
          '네이버 입력기로 전송하려면 먼저 게시글을 저장해야 합니다.\n지금 저장하고 전송할까요?'
        )
      ) {
        setIsSaving(true)
        try {
          const markdown = buildCurrentMarkdown()
          const res = await fetch('/api/auto-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              saveOnly: true,
              title: draftTitle.trim(),
              excerpt: draftExcerpt.trim(),
              contentMarkdown: markdown,
              category_slugs: categorySlugs,
            }),
          })
          const data = await res.json()
          if (!res.ok || !data.success) throw new Error(data.error || '게시글 저장 실패')
          targetPostId = data.data?.postId
          setSavedPostId(targetPostId)
        } catch (err: any) {
          alert(err.message || '저장 중 오류가 발생했습니다.')
          setIsSaving(false)
          return
        } finally {
          setIsSaving(false)
        }
      } else {
        return
      }
    }

    if (!targetPostId) return
    setHandoffLoading(true)
    setHandoffStatus(null)
    try {
      const res = await fetch(`/api/posts/${targetPostId}/extension-handoff`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '확장 전송 실패')
      setHandoffStatus(
        '✓ 네이버 입력기(Chrome 확장)로 성공적으로 전송되었습니다! Chrome 확장 사이드패널에서 선택 후 입력을 시작하세요.'
      )
    } catch (err: any) {
      setHandoffStatus(`⚠️ 전송 실패: ${err.message}`)
    } finally {
      setHandoffLoading(false)
    }
  }

  // 총 글자 수 실시간 계산
  const currentTotalCharacters = draftSections.reduce(
    (acc, sec) => acc + sec.heading.length + sec.body.length,
    draftTitle.length + draftExcerpt.length
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans ai-form-container pb-20">
      {/* 메인 헤더 및 기획 폼 */}
      <main className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 space-y-10">
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8"
        >
          {/* 타이틀 헤더 */}
          <div className="space-y-2 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                AI 블로그(원문) 스튜디오
              </span>
              <span className="text-xs text-slate-400">·</span>
              <span className="text-xs text-slate-500 font-medium">실시간 본문 및 이미지 생성 & 블록 편집기</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              AI 맞춤 자동 글쓰기 & 실시간 편집
            </h1>
            <p className="text-sm font-medium text-slate-500">
              카테고리, 주제, AI 모델 및 이미지를 설정하시면 완성도 높은 본문과 이미지가 자동 생성되며, 생성 즉시 블록별로 편집하실 수 있습니다.
            </p>
          </div>

          {/* [상단] 1. 카테고리 복수 선택 섹션 */}
          <div className="space-y-3 bg-slate-50/80 p-5 rounded-2xl border border-slate-200/80">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Folder className="w-4 h-4 text-blue-600" />
                <span>포스팅 카테고리 선택 (복수 선택 가능)</span>
              </label>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
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

          {/* 2. 글 주제 입력 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>블로그 핵심 주제 <span className="text-red-500">*</span></span>
              </label>
              <span className="text-[11px] font-semibold text-slate-400">구체적일수록 높은 품질</span>
            </div>

            {/* 추천 예시 주제 칩 */}
            <div className="flex flex-wrap gap-1.5 pb-1">
              <span className="text-[11px] font-bold text-slate-400 self-center mr-1">추천 주제:</span>
              {SUGGESTED_TOPICS.map((suggested, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(suggested)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-colors border border-slate-200/60"
                >
                  {suggested}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 실무에서 바로 써먹는 2026 Next.js 16 최적화 꿀팁 7가지"
              className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:outline-none focus:border-blue-600 transition-colors text-sm font-bold text-slate-900 placeholder-slate-400 shadow-xs"
            />
          </div>

          {/* 3. 톤 & 타깃 독자 & 목표 글자수 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/50 p-5 rounded-2xl border border-slate-200/60">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">문체 및 어조 (Tone)</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} 어조
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">주요 타깃 독자</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="예: 30대 IT 직장인, 주부, 초보 창업자"
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">목표 글자수</label>
                <span className="text-xs font-extrabold text-blue-600">{targetWordCount.toLocaleString()}자</span>
              </div>
              <input
                type="range"
                min={800}
                max={3000}
                step={200}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer pt-2"
              />
            </div>
          </div>

          {/* 4. 필수 키워드 & 참고 URL */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">포함할 핵심 키워드 (엔터로 추가)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder="예: 성능최적화, 실무팁 (입력 후 Enter)"
                  className="flex-1 p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddKeyword(keywordInput)}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  추가
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1"
                    >
                      #{kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-blue-400 hover:text-blue-800 ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 참고 URL (선택) */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700">참고 URL / 벤치마킹 링크 (선택 3개)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {referenceUrls.map((url, idx) => (
                  <input
                    key={idx}
                    type="text"
                    inputMode="url"
                    value={url}
                    onChange={(e) => handleUrlChange(idx, e.target.value)}
                    onBlur={(e) => handleUrlChange(idx, normalizeUrl(e.target.value))}
                    placeholder={`https://참고링크-${idx + 1}.com`}
                    className="p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 5. AI 본문 및 이미지 생성 모델 설정 (SEO 스튜디오와 동일 구조) */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 본문 생성 모델 카드 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🤖 본문 생성 AI 엔진</span>
                  </span>
                  <span className="text-[11px] font-semibold text-blue-600">
                    {CONTENT_PROVIDER_LABELS[contentProvider]}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={contentProvider}
                    onChange={(e) => {
                      const p = e.target.value as ContentProvider
                      setContentProvider(p)
                      setContentModel(getDefaultContentModel(p))
                    }}
                    className="p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {CONTENT_PROVIDERS.map((p) => (
                      <option key={p} value={p}>
                        {CONTENT_PROVIDER_LABELS[p]}
                      </option>
                    ))}
                  </select>
                  <select
                    value={contentModel}
                    onChange={(e) => setContentModel(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {getContentModels(contentProvider).map((m) => (
                      <option key={m.value} value={m.value}>
                        {contentModelLabel(m)}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  선택한 AI 플랫폼에 등록된 본인 API 키를 사용합니다.
                </p>
              </div>

              {/* 이미지 생성 모델 카드 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>🖼️ 이미지 생성 엔진</span>
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600">Google 나노바나나</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={imageModel}
                    onChange={(e) => setImageModel(e.target.value)}
                    className="p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {IMAGE_MODEL_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {imageModelLabel(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={imageCount}
                    onChange={(e) => setImageCount(Number(e.target.value))}
                    className="p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {IMAGE_COUNT_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500">
                  문단별 핵심 내용을 분석하여 대표 및 본문 이미지를 분할 생성합니다.
                </p>
              </div>
            </div>

            <ImageStorageNotice compact />
          </div>

          {/* 6. 추천 링크 (CTA) & 지시사항 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">추천 버튼 문구 (CTA)</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="예: 무료 전자책 가이드 다운로드"
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">추천 대상 URL</label>
              <input
                type="text"
                inputMode="url"
                value={ctaUrl}
                onChange={(e) => setCtaUrl(e.target.value)}
                onBlur={(e) => setCtaUrl(normalizeUrl(e.target.value))}
                placeholder="https://example.com/offer"
                className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">추가 지시사항 (선택 프롬프트)</label>
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="꼭 다뤄야 할 내용, 피해야 할 내용 등 특별 요구사항"
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 resize-none shadow-xs"
            />
          </div>

          {/* 상태 메시지 */}
          {statusMsg && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-700 flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* 1단계 생성 시작 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>AI 글 & 이미지 생성 진행 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>✨ AI 블로그 글 & 이미지 생성 시작</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ------------------------------------------------------------------ */}
        {/* [2단계] 생성된 블로그(원문) 검토 및 블록 편집기 (Content Block Editor) */}
        {/* ------------------------------------------------------------------ */}
        {draftResult && (
          <section
            id="editor-section"
            ref={editorSectionRef}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-8 animate-fadeIn"
          >
            {/* 상단 컨트롤 & 상태 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    생성 완료 · 검토 및 편집 모드
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md">
                    총 {currentTotalCharacters.toLocaleString()}자 (공백 포함)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    (공백 제외 {draftSections.reduce((acc, s) => acc + s.heading.replace(/\s/g, '').length + s.body.replace(/\s/g, '').length, draftTitle.replace(/\s/g, '').length + draftExcerpt.replace(/\s/g, '').length).toLocaleString()}자)
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  생성된 제목, 요약, 문단과 이미지를 자유롭게 수정하고 순서를 변경할 수 있습니다.
                </p>
              </div>

              {/* 우측 빠른 액션 버튼 */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? '복사 완료!' : '원고 복사'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveFinalPost}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{savedPostId ? '저장 완료 (다시 저장)' : '최종 발행 및 저장'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendToExtension}
                  disabled={handoffLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center gap-1.5 shadow-sm transition-colors disabled:opacity-50"
                >
                  {handoffLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>🧩 네이버 입력기 전송</span>
                </button>
              </div>
            </div>

            {/* 네이버 입력기 상태 안내 */}
            {handoffStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{handoffStatus}</span>
              </div>
            )}

            {/* 1. 포스트 제목 편집 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                <span>블로그 포스트 제목 (클릭하여 수정)</span>
              </label>
              <input
                type="text"
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 focus:border-blue-600 focus:outline-none text-lg sm:text-xl font-extrabold text-slate-900 shadow-xs"
              />
            </div>

            {/* 2. 핵심 요약문 (Excerpt) 편집 */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                <span>포스트 핵심 요약 인용문 (Excerpt)</span>
              </label>
              <textarea
                rows={2}
                value={draftExcerpt}
                onChange={(e) => setDraftExcerpt(e.target.value)}
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-600 focus:outline-none text-xs font-semibold text-slate-800 shadow-xs resize-none"
              />
            </div>

            {/* 3. 대표 이미지 (Cover Image) 관리 카드 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>대표 비주얼 이미지 (Title Cover Image)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    글 요약문 바로 아래 삽입되는 전체 대표 이미지입니다.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerateCoverImage}
                    disabled={regeneratingCover}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    {regeneratingCover ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>생성 중...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>대표 이미지 다시 생성</span>
                      </>
                    )}
                  </button>
                  {draftCoverImage && (
                    <button
                      type="button"
                      onClick={() => setDraftCoverImage('')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="대표 이미지 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {draftCoverImage ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
                  <div
                    className="relative w-full sm:w-60 h-36 bg-slate-100 rounded-lg overflow-hidden cursor-pointer group shrink-0"
                    onClick={() => setViewingImageUrl(draftCoverImage)}
                  >
                    <img
                      src={draftCoverImage}
                      alt={draftTitle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="p-1.5 rounded-full bg-white/90 text-slate-800 shadow-md">
                        <Maximize2 className="w-4 h-4" />
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs w-full">
                    <div className="font-semibold text-slate-800">
                      대표 이미지 저장 완료 (Supabase Storage)
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded truncate">
                      {draftCoverImage}
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(draftCoverImage)
                          alert('대표 이미지 URL이 복사되었습니다!')
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>URL 복사</span>
                      </button>
                      <a
                        href={draftCoverImage}
                        target="_blank"
                        rel="noopener noreferrer"
                        download="blog-cover.png"
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>다운로드</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 text-slate-400 text-xs">
                  대표 이미지가 설정되어 있지 않습니다. 우측 [대표 이미지 다시 생성] 버튼을 눌러 생성할 수 있습니다.
                </div>
              )}
            </div>

            {/* 4. 본문 문단 블록 편집기 (Content Block Editor) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="space-y-0.5">
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>본문 문단 블록 편집기 ({draftSections.length}개 문단)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    문단별 소제목과 본문을 직접 편집하고, 위·아래 버튼으로 문단 순서를 재배치할 수 있습니다.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>문단 추가</span>
                </button>
              </div>

              {/* 문단 카드 리스트 */}
              <div className="space-y-5">
                {draftSections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4 hover:border-slate-300 transition-colors"
                  >
                    {/* 블록 상단 툴바 */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700">
                          문단 #{idx + 1}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          약 {sec.body.length.toLocaleString()}자
                        </span>
                      </div>

                      {/* 순서 이동 & 삭제 액션 */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, -1)}
                          disabled={idx === 0}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors"
                          title="위로 이동"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSection(idx, 1)}
                          disabled={idx === draftSections.length - 1}
                          className="p-1 rounded-md hover:bg-slate-100 text-slate-600 disabled:opacity-30 transition-colors"
                          title="아래로 이동"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.id)}
                          className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors ml-1"
                          title="문단 삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* 소제목 인풋 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        소제목 (H2)
                      </label>
                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => handleUpdateSection(sec.id, 'heading', e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-sm text-slate-900 focus:outline-none focus:border-blue-600 shadow-xs"
                      />
                    </div>

                    {/* 문단 전용 이미지 (있는 경우) */}
                    {sec.imageUrl ? (
                      <div className="flex flex-col sm:flex-row items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <div
                          className="relative w-full sm:w-44 h-28 bg-slate-200 rounded-lg overflow-hidden cursor-pointer group shrink-0"
                          onClick={() => setViewingImageUrl(sec.imageUrl!)}
                        >
                          <img
                            src={sec.imageUrl}
                            alt={sec.heading}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-1.5 text-xs w-full">
                          <div className="font-semibold text-slate-800">
                            문단 #{idx + 1} 삽입 이미지
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleRegenerateSectionImage(sec)}
                              disabled={regeneratingSectionId === sec.id}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold border border-blue-200 flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                              {regeneratingSectionId === sec.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  <span>생성 중...</span>
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="w-3 h-3" />
                                  <span>이 이미지만 다시 생성</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveSectionImage(sec.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-600 transition-colors"
                              title="이미지 제거"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-slate-50/70 rounded-xl border border-dashed border-slate-200 text-[11px] text-slate-400">
                        <span>이 문단에는 이미지가 삽입되어 있지 않습니다.</span>
                        <button
                          type="button"
                          onClick={() => handleRegenerateSectionImage(sec)}
                          disabled={regeneratingSectionId === sec.id}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-semibold border border-slate-200 flex items-center gap-1 transition-colors"
                        >
                          {regeneratingSectionId === sec.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ImageIcon className="w-3 h-3 text-emerald-600" />
                          )}
                          <span>AI 이미지 생성</span>
                        </button>
                      </div>
                    )}

                    {/* 본문 텍스트에어리어 */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                        문단 본문 내용
                      </label>
                      <textarea
                        rows={6}
                        value={sec.body}
                        onChange={(e) => handleUpdateSection(sec.id, 'body', e.target.value)}
                        className="w-full p-4 rounded-xl border border-slate-200 text-sm leading-relaxed text-slate-800 font-sans focus:outline-none focus:border-blue-600 shadow-inner"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* 하단 문단 추가 버튼 */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleAddSection}
                  className="px-5 py-2.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>새 본문 문단 추가하기</span>
                </button>
              </div>
            </div>

            {/* 5. CTA 및 태그 정보 */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>추천 링크 (CTA) 버튼 문구</span>
                  </label>
                  <input
                    type="text"
                    value={draftCtaText}
                    onChange={(e) => setDraftCtaText(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">추천 대상 링크 URL</label>
                  <input
                    type="text"
                    inputMode="url"
                    value={draftCtaUrl}
                    onChange={(e) => setDraftCtaUrl(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                  />
                </div>
              </div>

              {/* 추천 해시태그 */}
              {draftHashtags && (
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      <span>추천 SEO 태그</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(draftHashtags)
                        alert('해시태그가 복사되었습니다!')
                      }}
                      className="text-[11px] text-blue-600 hover:underline font-semibold"
                    >
                      태그 복사
                    </button>
                  </div>
                  <div className="text-xs font-semibold text-slate-700 bg-white p-3 rounded-xl border border-slate-200">
                    {draftHashtags}
                  </div>
                </div>
              )}
            </div>

            {/* 6. 최종 액션 바 (하단 고정형 느낌의 완료 바) */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>편집이 완료되었습니다!</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    블로그에 정식 저장하거나 크롬 확장 네이버 입력기로 바로 전송할 수 있습니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleCopyContent}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copied ? '복사 완료!' : '전체 원고 복사'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSendToExtension}
                    disabled={handoffLoading}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md transition-colors disabled:opacity-50"
                  >
                    {handoffLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    <span>🧩 네이버 입력기 전송</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveFinalPost}
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{savedPostId ? '저장 완료 (다시 저장)' : '🚀 최종 발행 및 블로그에 등록'}</span>
                  </button>
                </div>
              </div>

              {savedPostId && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between">
                  <span>게시글이 성공적으로 DB에 등록되었습니다! (ID #{savedPostId})</span>
                  <Link
                    href={`${getBlogBasePath()}/posts/${savedPostId}`}
                    className="font-bold underline text-white hover:text-emerald-200"
                  >
                    게시글 상세 페이지 바로가기 →
                  </Link>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      {/* 이미지 크게 보기 모달 */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setViewingImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 bg-slate-900 text-white border-b border-slate-800">
              <span className="text-xs font-medium text-slate-300">AI 이미지 고해상도 미리보기</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>새 탭에서 열기</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingImageUrl(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex items-center justify-center bg-black/40 overflow-auto">
              <img
                src={viewingImageUrl}
                alt="AI Blog Preview"
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
