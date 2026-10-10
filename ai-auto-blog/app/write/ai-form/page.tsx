'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Sparkles,
  Copy,
  Save,
  Send,
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
  Eye,
  Download,
  Loader2,
  FileText,
  Clock,
  Tag,
  Link as LinkIcon,
  ChevronRight,
  Folder,
  RotateCcw,
  Edit3,
  BookOpen,
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
  contentModelLabel,
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
  postId?: number
  postUrl?: string
  title?: string
  excerpt?: string
  contentMarkdown?: string
  contentHtml?: string
  readingMinutes?: number
  categorySlug?: string
  categorySlugs?: string[]
  coverImage?: { url: string; caption?: string }
  sections?: PostSection[]
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

  // 폼 입력 상태
  const [categorySlugs, setCategorySlugs] = useState<string[]>(['architecture'])
  const [topic, setTopic] = useState(() => searchParams.get('topic') ?? '')
  const [tone, setTone] = useState('전문적')
  const [targetAudience, setTargetAudience] = useState('')
  const [targetWordCount, setTargetWordCount] = useState(2000)
  const [keywordInput, setKeywordInput] = useState('')
  const [keywords, setKeywords] = useState<string[]>(() => {
    const raw = searchParams.get('keywords')
    return raw ? raw.split(',').map((k) => k.trim()).filter(Boolean) : []
  })
  const [referenceUrls, setReferenceUrls] = useState<string[]>(['', '', ''])

  // AI 본문 및 이미지 설정
  const [imageModel, setImageModel] = useState<string>(DEFAULT_IMAGE_MODEL)
  const [imageCount, setImageCount] = useState<number>(DEFAULT_IMAGE_COUNT)
  const [contentProvider, setContentProvider] = useState<ContentProvider>(DEFAULT_CONTENT_PROVIDER)
  const [contentModel, setContentModel] = useState<string>(getDefaultContentModel(DEFAULT_CONTENT_PROVIDER))

  // 로컬 스토리지 모델 기억
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(MODEL_STORAGE_KEY) ?? 'null')
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

  // CTA 및 추가 지시
  const [ctaText, setCtaText] = useState('추천링크')
  const [ctaUrl, setCtaUrl] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')

  // 로딩 & 상태 메시지
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  // 생성 완료된 결과 상태
  const [draftResult, setDraftResult] = useState<DraftResultData | null>(null)
  const [savedPostId, setSavedPostId] = useState<number | null>(null)
  const [savedPostUrl, setSavedPostUrl] = useState<string | null>(null)

  // 뷰어 모드: 'article' (완성본 블로그 뷰) | 'edit' (인라인 블록 빠른 편집)
  const [viewMode, setViewMode] = useState<'article' | 'edit'>('article')

  // 인라인 수정 상태
  const [draftTitle, setDraftTitle] = useState('')
  const [draftExcerpt, setDraftExcerpt] = useState('')
  const [draftCoverImage, setDraftCoverImage] = useState('')
  const [draftSections, setDraftSections] = useState<PostSection[]>([])
  const [draftCtaText, setDraftCtaText] = useState('')
  const [draftCtaUrl, setDraftCtaUrl] = useState('')
  const [draftHashtags, setDraftHashtags] = useState('')

  // 수정사항 DB 저장 로딩
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  // 네이버 크롬 확장 연동 상태
  const [handoffStatus, setHandoffStatus] = useState<string | null>(null)
  const [handoffLoading, setHandoffLoading] = useState(false)

  // 이미지 모달 뷰어 상태
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)

  // 이미지 개별 재생성 로딩
  const [regeneratingCover, setRegeneratingCover] = useState(false)
  const [regeneratingSectionId, setRegeneratingSectionId] = useState<string | null>(null)

  const resultSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }: any) => {
      setUserEmail(data?.user?.email ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setUserEmail(session?.user?.email ?? null)
    })

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

  // ★ [원클릭 생성 & DB 즉시 등록]: 본문 + 이미지 생성 및 사이사이 배치 후 DB에 한번에 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topic.trim()) {
      alert('⚠️ 블로그 주제를 입력해주세요!\n(상단의 [추천 예시 주제] 칩 버튼을 클릭하시면 간편하게 선택하실 수 있습니다.)')
      return
    }

    try {
      setLoading(true)
      setStatusMsg(`실시간 뉴스/트렌드 분석 ➔ AI 본문 생성 ➔ ${imageCount}장의 고화질 이미지 생성 ➔ 본문 사이사이 배치 ➔ 블로그 자동 등록을 한 번에 진행하고 있습니다...`)
      setSavedPostId(null)
      setSavedPostUrl(null)
      setHandoffStatus(null)
      setViewMode('article') // 기본 완성본 뷰

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

      const result: DraftResultData = data.data
      setDraftResult(result)
      const createdId = result.postId || data.postId
      if (createdId) {
        setSavedPostId(createdId)
        setSavedPostUrl(result.postUrl || `/posts/${createdId}`)
      }

      setDraftTitle(result.title || topic.trim())
      setDraftExcerpt(result.excerpt || '')
      setDraftCoverImage(result.coverImage?.url || '')
      setDraftSections(result.sections && result.sections.length > 0 ? result.sections : [
        { id: 'sec-1', heading: '주요 개요 및 핵심 분석', body: result.contentMarkdown || '' }
      ])
      setDraftCtaText(result.cta?.text || ctaText || '자세히 보기')
      setDraftCtaUrl(result.cta?.url || ctaUrl || '')
      setDraftHashtags(result.hashtags || '')

      // 결과 섹션으로 스크롤 이동
      setTimeout(() => {
        const el = document.getElementById('result-section')
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

  // 문단 블록 인라인 수정 핸들러
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

  // 대표 이미지 재생성
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

  // 문단 이미지 재생성
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
      alert(err.message || '문단 이미지 재생성 중 오류가 발생했습니다.')
    } finally {
      setRegeneratingSectionId(null)
    }
  }

  // 조립된 마크다운 빌더
  const buildCurrentMarkdown = () => {
    const parts: string[] = []
    if (draftExcerpt.trim()) {
      parts.push(`> ${draftExcerpt.trim()}`)
    }
    if (draftCoverImage) {
      parts.push(`![${draftTitle} 대표 비주얼](${draftCoverImage})`)
    }
    draftSections.forEach((sec) => {
      const sectionLines: string[] = []
      if (sec.heading.trim()) sectionLines.push(`## ${sec.heading.trim()}`)
      if (sec.imageUrl) sectionLines.push(`![${sec.heading} 비주얼](${sec.imageUrl})`)
      if (sec.body.trim()) sectionLines.push(sec.body.trim())
      if (sectionLines.length > 0) parts.push(sectionLines.join('\n\n'))
    })
    if (draftCtaText.trim() && draftCtaUrl.trim()) {
      parts.push(`---\n\n> [👉 ${draftCtaText.trim()} 바로가기](${normalizeUrl(draftCtaUrl)})`)
    }
    if (draftHashtags.trim()) {
      parts.push(`---\n\n${draftHashtags.trim()}`)
    }
    return parts.join('\n\n')
  }

  // 인라인 수정 사항 DB 저장/업데이트
  const handleSaveUpdatedPost = async () => {
    if (!draftTitle.trim()) {
      alert('게시글 제목을 입력해주세요.')
      return
    }
    try {
      setIsSaving(true)
      const compiledMarkdown = buildCurrentMarkdown()
      const payload = {
        saveOnly: true,
        mode: 'save',
        postId: savedPostId || undefined,
        title: draftTitle.trim(),
        excerpt: draftExcerpt.trim(),
        contentMarkdown: compiledMarkdown,
        category_slugs: categorySlugs,
      }

      const res = await fetch('/api/auto-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '게시글 수정 저장에 실패했습니다.')
      }

      const updatedId = data.data?.postId || savedPostId
      if (updatedId) {
        setSavedPostId(updatedId)
        setSavedPostUrl(`/posts/${updatedId}`)
      }
      alert('✅ 수정사항이 블로그 데이터베이스에 안전하게 반영되었습니다!')
      setViewMode('article') // 저장 후 완성본 뷰로 전환
    } catch (err: any) {
      console.error('[Update Save Error]:', err)
      alert(err.message || '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 원고 클립보드 복사
  const handleCopyContent = async () => {
    try {
      const compiledMarkdown = buildCurrentMarkdown()
      const fullText = `# ${draftTitle}\n\n${compiledMarkdown}`
      await navigator.clipboard.writeText(fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      alert('클립보드 복사에 실패했습니다. 수동으로 복사해주세요.')
    }
  }

  // 크롬 확장 프로그램으로 스마트에디터 전송
  const handleSendToExtension = async () => {
    if (!savedPostId) {
      alert('게시글 등록 정보를 확인할 수 없습니다.')
      return
    }
    try {
      setHandoffLoading(true)
      setHandoffStatus('네이버 입력기 크롬 확장에 등록 중...')
      const res = await fetch(`/api/posts/${savedPostId}/extension-handoff`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || '크롬 확장 전달에 실패했습니다.')
      }
      setHandoffStatus(`🧩 네이버 입력기로 보냈습니다. 확장 프로그램이 연결돼 있으면 ${data.autoStartMinutes ?? 30}분 안에 네이버 글쓰기 화면을 새로 열어 자동으로 입력합니다. (마지막 발행은 직접 누르세요.)`)
    } catch (err: any) {
      setHandoffStatus(`⚠️ 전달 오류: ${err.message}`)
    } finally {
      setHandoffLoading(false)
    }
  }

  // 새 글 쓰기 (폼 초기화)
  const handleResetForm = () => {
    if (confirm('새 블로그 글을 작성하시겠습니까? 현재 결과 화면이 초기화됩니다.')) {
      setDraftResult(null)
      setSavedPostId(null)
      setSavedPostUrl(null)
      setHandoffStatus(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // 글자 수 실시간 집계
  const currentTotalCharacters = draftSections.reduce(
    (acc, s) => acc + s.heading.length + s.body.length,
    draftTitle.length + draftExcerpt.length
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans ai-form-container">
      {/* 상단 네비게이션 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={basePath ? `${basePath}/dashboard` : '/dashboard'}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <span>← 대시보드</span>
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>AI 맞춤 자동 글쓰기</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {savedPostId && (
              <a
                href={savedPostUrl || `/posts/${savedPostId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors"
              >
                <span>등록된 글 보기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <Link
              href={basePath ? `${basePath}/settings` : '/settings'}
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              API키·플랫폼설정
            </Link>
          </div>
        </div>
      </header>

      {/* 메인 워크스페이스 컨테이너 */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ================================================================== */}
        {/* [1단계] 블로그 생성 폼: 주제, 옵션, 모델, 이미지 장수 설정           */}
        {/* ================================================================== */}
        <form
          onSubmit={handleSubmit}
          autoComplete="off"
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          {/* 타이틀 헤더 */}
          <div className="space-y-1.5 border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <span>AI 맞춤 자동 블로그 생성</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
                  원클릭 본문+이미지 통합 완성
                </span>
              </h1>
              {draftResult && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>새로 입력</span>
                </button>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed">
              주제와 옵션을 지정하고 [AI 글 생성 시작] 버튼을 누르면, <strong>AI 본문 텍스트와 1~5장의 고화질 이미지가 사이사이에 자동 배치</strong>된 완성본 포스트가 즉시 데이터베이스에 등록됩니다.
            </p>
          </div>

          {/* 1. 카테고리 다중 선택 바 */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Folder className="w-3.5 h-3.5 text-blue-600" />
              <span>포스팅 카테고리 (복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const active = categorySlugs.includes(cat.slug)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleToggleCategory(cat.slug)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. 주제 입력 & 추천 예시 칩 */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>블로그 핵심 주제 / 글감 *</span>
              <span className="text-[11px] font-normal text-slate-400">네이버/구글 검색 최적화 반영</span>
            </label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="예: 2026 직장인 생산성 2배 올리는 AI 자동화 툴 5선"
              className="w-full p-4 rounded-2xl border border-slate-300 bg-white text-base font-extrabold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all shadow-xs"
            />
            {/* 추천 주제 칩 */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400">💡 추천 주제:</span>
              {SUGGESTED_TOPICS.map((sTopic, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTopic(sTopic)}
                  className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-300 text-[11px] font-semibold text-slate-600 hover:text-blue-700 transition-colors"
                >
                  {sTopic}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 톤 & 타깃 독자 & 목표 글자수 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">문체 및 어조 (Tone)</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} 어조
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">주요 타깃 독자</label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="예: 30대 IT 직장인, 주부, 초보 창업자"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">목표 글자수</label>
                <span className="text-xs font-extrabold text-blue-600">{targetWordCount.toLocaleString()}자</span>
              </div>
              <input
                type="range"
                min={800}
                max={3500}
                step={200}
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer pt-2"
              />
            </div>
          </div>

          {/* 4. 필수 키워드 & 참고 URL */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">포함할 핵심 키워드 (선택, 엔터 추가)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={handleKeywordKeyDown}
                  placeholder="예: 실무팁, 생산성, 가성비 (입력 후 Enter)"
                  className="flex-1 p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => handleAddKeyword(keywordInput)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  추가
                </button>
              </div>
              {keywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200 flex items-center gap-1"
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
            <div className="space-y-1.5">
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

          {/* 5. AI 본문 및 이미지 생성 모델 설정 */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 본문 생성 모델 카드 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
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
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
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
                  1번 대표 썸네일 및 문단 1~4 소제목 밑에 고르게 분할 삽입됩니다.
                </p>
              </div>
            </div>

            <ImageStorageNotice compact />
          </div>

          {/* 6. 추천 링크 (CTA) & 지시사항 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">추천 버튼 문구 (CTA - 행동 유도)</label>
              <input
                type="text"
                value={ctaText}
                onChange={(e) => setCtaText(e.target.value)}
                placeholder="예: 무료 전자책 가이드 다운로드"
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
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
                className="w-full p-2.5 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-600 shadow-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">추가 지시사항 (선택 커스텀 프롬프트)</label>
            <textarea
              rows={2}
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="꼭 다뤄야 할 내용, 피해야 할 표현, 강조할 점 등 (선택)"
              className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 resize-none shadow-xs"
            />
          </div>

          {/* 상태 메시지 게이지 */}
          {statusMsg && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs font-bold text-blue-700 flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* 블로그 생성 및 등록 버튼 */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>AI 본문 + 이미지 동시 생성 및 블로그 자동 등록 중...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>✨ AI 블로그 포스트 생성 및 즉시 등록 (원클릭)</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* ================================================================== */}
        {/* [2단계] 생성 완료된 블로그 포스트 결과 화면 (Article Viewer & Actions) */}
        {/* ================================================================== */}
        {draftResult && (
          <section
            id="result-section"
            ref={resultSectionRef}
            className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-fadeIn"
          >
            {/* 상단 완료 배지 & 컨트롤 바 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>블로그 등록 완료 #{savedPostId}</span>
                  </span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                    총 {currentTotalCharacters.toLocaleString()}자 (공백 포함)
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>약 {draftResult.readingMinutes || 3}분 소요</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  본문 사이사이에 이미지가 자동 배치된 완성본 포스트입니다. 원고 복사 또는 네이버 입력기로 바로 전송할 수 있습니다.
                </p>
              </div>

              {/* 뷰 모드 탭 토글: 완성본 뷰 vs 빠른 편집 */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setViewMode('article')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'article'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5 inline mr-1" />
                  <span>완성본 미리보기</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    viewMode === 'edit'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 inline mr-1" />
                  <span>빠른 내용 수정</span>
                </button>
              </div>
            </div>

            {/* 원클릭 빠른 액션 버튼 바 */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-extrabold text-slate-800 flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? '복사 완료!' : '📋 원고 전체 복사'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendToExtension}
                  disabled={handoffLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-extrabold text-white flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  {handoffLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>🧩 네이버 입력기 전송</span>
                </button>
                {savedPostId && (
                  <a
                    href={savedPostUrl || `/posts/${savedPostId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-blue-700 flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>등록된 글 보기</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedPostId && (
                  <Link
                    href={`/posts/${savedPostId}/edit`}
                    className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span>상세 에디터</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-600 transition-colors"
                >
                  새 글 작성
                </button>
              </div>
            </div>

            {/* 네이버 스마트에디터 확장 전송 알림 바 */}
            {handoffStatus && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{handoffStatus}</span>
              </div>
            )}

            {/* -------------------------------------------------------------- */}
            {/* [모드 1] 완성본 블로그 뷰어 (실제 포스트 레이아웃)                   */}
            {/* -------------------------------------------------------------- */}
            {viewMode === 'article' && (
              <article className="space-y-6 pt-2">
                {/* 1. 포스트 메인 타이틀 */}
                <div className="space-y-2 border-b border-slate-100 pb-4">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
                    {draftTitle}
                  </h2>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-semibold text-blue-600">
                      {categories.find((c) => categorySlugs.includes(c.slug))?.name || '블로그'}
                    </span>
                    <span>·</span>
                    <span>{new Date().toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                {/* 2. 핵심 요약문 인용구 */}
                {draftExcerpt && (
                  <blockquote className="p-4 rounded-2xl bg-slate-50 border-l-4 border-blue-500 text-slate-700 text-sm font-semibold leading-relaxed italic">
                    {draftExcerpt}
                  </blockquote>
                )}

                {/* 3. 대표 썸네일 이미지 (선택한 1번 이미지) */}
                {draftCoverImage && (
                  <figure className="space-y-2 my-4">
                    <div
                      onClick={() => setViewingImageUrl(draftCoverImage)}
                      className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-zoom-in shadow-xs"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draftCoverImage}
                        alt={`${draftTitle} 대표 비주얼`}
                        className="w-full max-h-[460px] object-cover group-hover:scale-[1.01] transition-transform duration-200"
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        클릭하여 확대
                      </div>
                    </div>
                    <figcaption className="text-center text-xs text-slate-400 font-medium">
                      📷 {draftTitle} 대표 비주얼
                    </figcaption>
                  </figure>
                )}

                {/* 4. 본문 섹션들 (소제목 + 사이사이 이미지 + 본문 텍스트) */}
                <div className="space-y-8 pt-2">
                  {draftSections.map((sec, idx) => (
                    <section key={sec.id} className="space-y-4">
                      {/* 소제목 H2 */}
                      <h3 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                        <span className="text-blue-600 font-black">0{idx + 1}.</span>
                        <span>{sec.heading}</span>
                      </h3>

                      {/* 소제목 바로 밑에 삽입된 고화질 이미지 */}
                      {sec.imageUrl && (
                        <figure className="space-y-1.5 my-3">
                          <div
                            onClick={() => setViewingImageUrl(sec.imageUrl!)}
                            className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 group cursor-zoom-in shadow-xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sec.imageUrl}
                              alt={`${sec.heading} 비주얼`}
                              className="w-full max-h-[420px] object-cover group-hover:scale-[1.01] transition-transform duration-200"
                            />
                            <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                              클릭하여 확대
                            </div>
                          </div>
                          <figcaption className="text-center text-xs text-slate-400 font-medium">
                            📷 {sec.heading} 비주얼
                          </figcaption>
                        </figure>
                      )}

                      {/* 문단 본문 (가독성 높은 줄바꿈) */}
                      <div className="text-slate-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal space-y-3">
                        {sec.body}
                      </div>
                    </section>
                  ))}
                </div>

                {/* 5. 추천/홍보 링크 박스 (CTA) */}
                {draftCtaText && draftCtaUrl && (
                  <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-3 my-6">
                    <div className="space-y-0.5 text-center sm:text-left">
                      <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">추천 링크</span>
                      <p className="text-sm font-extrabold text-slate-900">{draftCtaText}</p>
                    </div>
                    <a
                      href={normalizeUrl(draftCtaUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition-colors shrink-0"
                    >
                      자세히 보기 →
                    </a>
                  </div>
                )}

                {/* 6. 추천 해시태그 목록 */}
                {draftHashtags && (
                  <div className="pt-4 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-400 block mb-2">SEO 해시태그:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {draftHashtags.split(/\s+/).filter(Boolean).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold"
                        >
                          {tag.startsWith('#') ? tag : `#${tag}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )}

            {/* -------------------------------------------------------------- */}
            {/* [모드 2] 빠른 내용 수정 모드 (소제목/본문/이미지 인라인 에디터)        */}
            {/* -------------------------------------------------------------- */}
            {viewMode === 'edit' && (
              <div className="space-y-6 pt-2">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-semibold flex items-center justify-between">
                  <span>💡 문단 내용을 수정한 후 하단의 [수정사항 DB 저장] 버튼을 누르면 즉시 데이터베이스에 반영됩니다.</span>
                  <button
                    type="button"
                    onClick={handleSaveUpdatedPost}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 shrink-0 ml-2"
                  >
                    {isSaving ? '저장 중...' : '💾 수정사항 DB 저장'}
                  </button>
                </div>

                {/* 제목 수정 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">포스트 제목</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-base font-extrabold text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* 요약문 수정 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">핵심 요약문</label>
                  <textarea
                    rows={2}
                    value={draftExcerpt}
                    onChange={(e) => setDraftExcerpt(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-600 resize-none"
                  />
                </div>

                {/* 대표 이미지 카드 */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">대표 이미지 (썸네일)</span>
                    <button
                      type="button"
                      onClick={handleRegenerateCoverImage}
                      disabled={regeneratingCover}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 disabled:opacity-50"
                    >
                      {regeneratingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>다시 생성</span>
                    </button>
                  </div>
                  {draftCoverImage ? (
                    <div className="flex items-center gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draftCoverImage}
                        alt="대표 이미지"
                        className="w-32 h-20 object-cover rounded-xl border border-slate-200 cursor-pointer"
                        onClick={() => setViewingImageUrl(draftCoverImage)}
                      />
                      <div className="text-xs text-slate-500 space-y-1">
                        <p className="font-semibold text-slate-700">대표 썸네일로 설정됨</p>
                        <p className="text-[11px] text-slate-400">클릭하여 원본 크기 확인</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic">이미지 없음</div>
                  )}
                </div>

                {/* 본문 문단 블록 리스트 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">본문 문단 목록 ({draftSections.length}개)</span>
                    <button
                      type="button"
                      onClick={handleAddSection}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold border border-blue-200 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>문단 추가</span>
                    </button>
                  </div>

                  {draftSections.map((sec, idx) => (
                    <div
                      key={sec.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-blue-600">문단 0{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveSection(idx, 1)}
                            disabled={idx === draftSections.length - 1}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSection(sec.id)}
                            className="p-1 rounded text-red-400 hover:text-red-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <input
                        type="text"
                        value={sec.heading}
                        onChange={(e) => handleUpdateSection(sec.id, 'heading', e.target.value)}
                        placeholder="소제목을 입력하세요"
                        className="w-full p-2.5 rounded-xl border border-slate-300 text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600"
                      />

                      {/* 문단 이미지 영역 */}
                      <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        {sec.imageUrl ? (
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={sec.imageUrl}
                              alt={sec.heading}
                              className="w-16 h-10 object-cover rounded-lg border border-slate-200 cursor-pointer"
                              onClick={() => setViewingImageUrl(sec.imageUrl!)}
                            />
                            <span className="text-xs text-slate-600 font-medium">삽입된 이미지</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">이미지 없음</span>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleRegenerateSectionImage(sec)}
                            disabled={regeneratingSectionId === sec.id}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                          >
                            {regeneratingSectionId === sec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            <span>{sec.imageUrl ? '다시 생성' : '이미지 생성'}</span>
                          </button>
                          {sec.imageUrl && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSectionImage(sec.id)}
                              className="text-xs text-red-500 hover:text-red-700"
                            >
                              삭제
                            </button>
                          )}
                        </div>
                      </div>

                      <textarea
                        rows={4}
                        value={sec.body}
                        onChange={(e) => handleUpdateSection(sec.id, 'body', e.target.value)}
                        className="w-full p-3 rounded-xl border border-slate-300 text-xs font-normal text-slate-800 leading-relaxed focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  ))}
                </div>

                {/* 하단 수정사항 저장 버튼 */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveUpdatedPost}
                    disabled={isSaving}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>💾 수정사항 블로그에 반영 및 저장</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* 이미지 고해상도 확대 모달 */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setViewingImageUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full p-4 flex items-center justify-between text-white border-b border-slate-800">
              <span className="text-xs font-bold">📷 고화질 원본 이미지 뷰어</span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingImageUrl}
                  download="blog-image.png"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setViewingImageUrl(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-2 overflow-auto max-h-[80vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewingImageUrl}
                alt="확대 이미지"
                className="max-h-[75vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
