'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { getBlogBasePath } from '@/blog/utils/basePath'
import { stripImageGenerationSchema } from '@/blog/utils/stripImageSchema'

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

/* ------------------------------------------------------------------ */
/*  HTML5 Canvas Image Compression Helper                              */
/* ------------------------------------------------------------------ */
async function compressBase64Image(dataUrl: string, maxWidth = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(dataUrl)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      let width = img.width
      let height = img.height

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width)
        width = maxWidth
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(dataUrl)
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality)
      resolve(compressedDataUrl)
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Category {
  id: number
  name: string
  slug: string
}

interface Author {
  id: number
  name: string
  role: string
  avatar_url: string | null
}

interface Post {
  id: number
  title: string
  excerpt: string
  content: string
  published_at: string
  reading_minutes: number
  author_id: number
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`
}

function getInitials(name: string): string {
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const COVER_GRADIENTS: Record<string, string> = {
  React: 'linear-gradient(135deg, #60a5fa, #1d4ed8)',
  아키텍처: 'linear-gradient(135deg, #818cf8, #4338ca)',
  Rust: 'linear-gradient(135deg, #f87171, #b91c1c)',
  DevOps: 'linear-gradient(135deg, #34d399, #047857)',
  Kubernetes: 'linear-gradient(135deg, #22d3ee, #0e7490)',
  TypeScript: 'linear-gradient(135deg, #60a5fa, #1e40af)',
  성능: 'linear-gradient(135deg, #fbbf24, #b45309)',
  JavaScript: 'linear-gradient(135deg, #fde047, #a16207)',
  Go: 'linear-gradient(135deg, #2dd4bf, #0f766e)',
  Docker: 'linear-gradient(135deg, #818cf8, #3730a3)',
  데이터베이스: 'linear-gradient(135deg, #c4b5fd, #6d28d9)',
  보안: 'linear-gradient(135deg, #f9a8d4, #be185d)',
}
const DEFAULT_GRADIENT = 'linear-gradient(135deg, #94a3b8, #334155)'

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function PostDetailPage() {
  const params = useParams()
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id
  const postId = rawId ? Number(rawId) : NaN
  const supabase = useMemo(() => createClient(), [])

  const [post, setPost] = useState<Post | null>(null)
  const [author, setAuthor] = useState<Author | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [compressing, setCompressing] = useState(false)

  // 고화질 이미지 라이트박스 팝업 상태
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [selectedAlt, setSelectedAlt] = useState<string>('')

  // ESC 키로 이미지 팝업 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedImage(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // 본문 내 이미지 클릭 감지 핸들러
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.tagName === 'IMG') {
      const src = target.getAttribute('src')
      const alt = target.getAttribute('alt') || ''
      if (src) {
        setSelectedImage(src)
        setSelectedAlt(alt)
      }
    }
  }

  /* ---- Fetch post + relations ---- */
  const fetchPost = useCallback(async () => {
    if (!postId || isNaN(postId)) return

    try {
      setLoading(true)

      // 1차: Supabase Client SDK로 포스트 데이터 로드 (2.5초 타임아웃 래퍼로 무한 펜딩 100% 방지)
      let postData: any = null
      try {
        const queryPromise = supabase
          .from('blog_posts')
          .select('*')
          .eq('id', postId)
          .maybeSingle()

        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('TIMEOUT')), 2500)
        )

        const result: any = await Promise.race([queryPromise, timeoutPromise])
        if (result && result.data && !result.error) {
          postData = result.data
        }
      } catch (e) {
        console.warn('[FetchPost] Supabase client query delayed or failed, trying REST API fallback')
      }

      // 2차: REST API 백엔드(/api/posts/[id]) 폴백 로드
      if (!postData) {
        try {
          const apiRes = await fetch(`/api/posts/${postId}`)
          if (apiRes.ok) {
            const apiJson = await apiRes.json()
            if (apiJson.success && apiJson.data) {
              const d = apiJson.data
              postData = {
                id: d.id,
                title: d.title,
                excerpt: d.excerpt,
                content: d.content,
                reading_minutes: d.reading_minutes,
                published_at: d.published_at || d.created_at,
                author_id: d.blog_authors?.id || 1,
              }

              if (d.blog_authors) {
                setAuthor(d.blog_authors)
              }

              if (d.blog_post_categories && Array.isArray(d.blog_post_categories)) {
                const cats = d.blog_post_categories
                  .map((pc: any) => pc.blog_categories)
                  .filter(Boolean)
                setCategories(cats)
              }
            }
          }
        } catch (apiErr) {
          console.error('[FetchPost] REST API fallback failed:', apiErr)
        }
      }

      if (!postData) {
        setNotFound(true)
        return
      }

      setPost(postData)

      // 저자 정보 로드 (REST API에서 안 가져온 경우)
      if (postData.author_id) {
        try {
          const { data: authorData } = await supabase
            .from('blog_authors')
            .select('*')
            .eq('id', postData.author_id)
            .maybeSingle()
          if (authorData) setAuthor(authorData)
        } catch (e) {}
      }

      // 카테고리 정보 로드
      try {
        const { data: pcData } = await supabase
          .from('blog_post_categories')
          .select('category_id')
          .eq('post_id', postId)
        const catIds = pcData?.map((r: any) => r.category_id) ?? []
        if (catIds.length > 0) {
          const { data: catsData } = await supabase
            .from('blog_categories')
            .select('*')
            .in('id', catIds)
          if (catsData) setCategories(catsData)
        }
      } catch (e) {}

    } catch (err) {
      console.error('[FetchPost Error]:', err)
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }, [supabase, postId])

  useEffect(() => {
    if (postId && !isNaN(postId)) {
      fetchPost()
    } else if (rawId === 'undefined' || (rawId && isNaN(postId))) {
      setNotFound(true)
      setLoading(false)
    }
  }, [fetchPost, postId, rawId])

  /* ---- Auth state ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  const coverGradient = categories[0]
    ? COVER_GRADIENTS[categories[0].name] ?? DEFAULT_GRADIENT
    : DEFAULT_GRADIENT

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="flex flex-col min-h-screen">
      {/* =================== HEADER =================== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-[var(--border)]">
        <div className="max-w-[1200px] mx-auto px-6 h-[60px] flex items-center justify-between gap-4">
          <Link href={getBlogBasePath() || '/'} className="text-xl font-black text-indigo-600 hover:text-indigo-500 no-underline transition-colors">AutoBlog</Link>

          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors hidden sm:inline"
            >
              ← 다른 프로그램 보기
            </a>
            <Link href={getBlogBasePath() || '/'} className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors" aria-label="검색">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
            </Link>
            {userEmail ? (
              <>
                <Link href={`${getBlogBasePath()}/write/ai-form`} className="text-sm font-semibold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] px-4 py-2 rounded-lg no-underline transition-colors">글쓰기</Link>
                <Link href="/dashboard" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 no-underline transition-colors">
                  {userEmail}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 no-underline transition-colors">로그인</Link>
                <Link href="/register" className="text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg no-underline transition-colors">가입하기</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* =================== MAIN CONTENT =================== */}
      <main className="flex-1 max-w-[760px] w-full mx-auto px-6 py-10">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton h-8 w-3/4"></div>
            <div className="skeleton h-5 w-1/3"></div>
            <div className="skeleton h-64 w-full"></div>
            <div className="skeleton h-5 w-full"></div>
            <div className="skeleton h-5 w-full"></div>
          </div>
        ) : notFound || !post ? (
          <div className="text-center py-24">
            <p className="text-zinc-500 text-lg mb-4">게시글을 찾을 수 없습니다.</p>
            <Link href={getBlogBasePath() || '/'} className="text-[var(--primary)] font-semibold no-underline hover:underline">
              홈으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            {/* Back link */}
            <Link href={getBlogBasePath() || '/'} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 no-underline mb-6 transition-colors">
              <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
              </svg>
              목록으로
            </Link>

            {/* Title */}
            {/* 📂 등록된 카테고리 뱃지 (제목 바로 위 노출) */}
            {categories.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3.5">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`${getBlogBasePath() || '/'}?category=${encodeURIComponent(cat.slug)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-600 text-white shadow-sm hover:bg-blue-700 transition-all no-underline cursor-pointer"
                  >
                    <span>📂</span>
                    <span>{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-snug mb-4">
              {post.title}
            </h1>

            {/* Author + meta + Action Buttons */}
            <div className="flex items-center justify-between gap-4 mb-5 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                {author && (
                  <>
                    <div className="avatar-circle">{getInitials(author.name)}</div>
                    <div>
                      <p className="text-sm font-semibold text-zinc-800 leading-tight">{author.name}</p>
                      <p className="text-xs text-zinc-400">
                        {author.role} · {formatFullDate(post.published_at)} · {post.reading_minutes}분 읽기
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* 포스트 관리 (본문 복사 / 수정 / 삭제) 버튼 */}
              <div className="flex items-center gap-2">
                <button
                  disabled={compressing}
                  onClick={async () => {
                    if (!post || compressing) return
                    try {
                      setCompressing(true)
                      let rawContent = post.content || ''

                      // ★ 본문 복사 전 하단 프롬프트 및 API 요청 스키마 구역 전면 정제 (티스토리/블로그 붙여넣기 전용)
                      const promptSectionIdx = rawContent.search(/(<h[1-6][^>]*>[^<]*🎨\s*생성\s*이미지|<hr[^>]*>\s*<h[1-6][^>]*>[^<]*🎨|🎨\s*생성\s*이미지\s*AI\s*프롬프트)/i)
                      if (promptSectionIdx !== -1) {
                        let cleanCutIdx = promptSectionIdx
                        const priorHr = rawContent.lastIndexOf('<hr', promptSectionIdx)
                        if (priorHr !== -1 && promptSectionIdx - priorHr < 100) {
                          cleanCutIdx = priorHr
                        }
                        rawContent = rawContent.slice(0, cleanCutIdx).trim()
                      }
                      
                      // 1. 인라인 자바스크립트(onclick=...) 정제
                      rawContent = rawContent.replace(/onclick="[^"]*"/gi, '')

                      // 2. Base64 이미지 바이너리 추출 및 HTML5 Canvas 스마트 압축 (4MB -> 250KB)
                      const dataUrlMatches: string[] = []
                      rawContent.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g, (m) => {
                        dataUrlMatches.push(m)
                        return m
                      })

                      let compressedContent = rawContent

                      if (dataUrlMatches.length > 0) {
                        for (let idx = 0; idx < dataUrlMatches.length; idx++) {
                          const originalSrc = dataUrlMatches[idx]
                          const compressedSrc = await compressBase64Image(originalSrc, 1000, 0.75)
                          compressedContent = compressedContent.split(originalSrc).join(compressedSrc)
                        }
                      }

                      const plainText = compressedContent
                        .replace(/<figcaption[^>]*>.*?<\/figcaption>/gi, '')
                        .replace(/<[^>]+>/g, '')
                        .replace(/\n{3,}/g, '\n\n')
                        .trim()

                      if (navigator.clipboard && window.ClipboardItem) {
                        const htmlBlob = new Blob([compressedContent], { type: 'text/html' })
                        const textBlob = new Blob([plainText], { type: 'text/plain' })
                        const item = new ClipboardItem({
                          'text/html': htmlBlob,
                          'text/plain': textBlob,
                        })
                        await navigator.clipboard.write([item])
                      } else {
                        await navigator.clipboard.writeText(compressedContent)
                      }

                      setCompressing(false)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 3000)
                    } catch (err) {
                      console.error('[Copy Error]:', err)
                      setCompressing(false)
                      try {
                        const simpleText = (post.content || '').replace(/<[^>]+>/g, '').trim()
                        await navigator.clipboard.writeText(simpleText)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 3000)
                      } catch {
                        alert('본문 복사 중 오류가 발생했습니다.')
                      }
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shadow-sm ${
                    compressing
                      ? 'bg-amber-500 text-white animate-pulse'
                      : copied
                      ? 'bg-emerald-600 text-white shadow-emerald-200 font-extrabold'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100'
                  }`}
                >
                  {compressing ? '⏳ 이미지 750KB 압축 중...' : copied ? '✓ 본문 & 이미지 복사 완료! (Ctrl+V로 붙여넣으세요)' : '📋 본문 복사하기'}
                </button>
                <Link
                  href={`${getBlogBasePath()}/posts/${post.id}/edit`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all cursor-pointer no-underline shadow-sm"
                >
                  ✏️ 수정
                </Link>
                <button
                  onClick={async () => {
                    if (confirm('정말로 이 게시글을 삭제하시겠습니까?\n삭제 후에는 복구할 수 없습니다.')) {
                      try {
                        const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
                        const json = await res.json()
                        if (res.ok && json.success) {
                          alert('게시글이 성공적으로 삭제되었습니다.')
                          window.location.replace(getBlogBasePath() || '/')
                        } else {
                          alert(json.error || '게시글 삭제에 실패했습니다.')
                        }
                      } catch {
                        alert('서버 통신 중 오류가 발생했습니다.')
                      }
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-semibold rounded-lg border border-slate-200 transition-all cursor-pointer shadow-sm"
                >
                  🗑️ 삭제
                </button>
              </div>
            </div>

            {/* Category tags */}
            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mb-6">
                {categories.map((cat) => (
                  <span key={cat.id} className="category-tag" data-category={cat.name}>
                    {cat.name}
                  </span>
                ))}
              </div>
            )}

            {/* Cover Box Removed - Real Photorealistic AI Header Image render in post-content */}

            {/* Content (클릭 시 라이트박스 팝업 연동) */}
            <div
              className="post-content"
              onClick={handleContentClick}
              dangerouslySetInnerHTML={{ __html: stripImageGenerationSchema(post.content) }}
            />

          </>
        )}
      </main>

      {/* =================== FOOTER =================== */}
      <footer className="border-t border-[var(--border)] bg-zinc-50">
        <div className="max-w-[1200px] mx-auto px-6 py-8 flex items-center justify-between">
          <span className="text-lg font-extrabold text-zinc-900 tracking-tight">AutoBlog</span>
          <nav className="flex items-center gap-6">
            <Link href="/docs" className="text-sm text-zinc-500 hover:text-zinc-900 no-underline transition-colors">문서</Link>
            <Link href="/changelog" className="text-sm text-zinc-500 hover:text-zinc-900 no-underline transition-colors">변경 내역</Link>
            <Link href="/privacy" className="text-sm text-zinc-500 hover:text-zinc-900 no-underline transition-colors">개인정보 처리방침</Link>
          </nav>
        </div>
      </footer>

      {/* =================== LIGHTBOX POPUP MODAL =================== */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-6 animate-fade-in cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          {/* Top Bar */}
          <div className="w-full max-w-5xl flex items-center justify-between text-white/80 mb-3 px-2">
            <span className="text-xs font-medium text-slate-300 truncate max-w-[80%]">
              📷 {selectedAlt || '고화질 AI 원본 이미지'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-full transition-colors backdrop-blur flex items-center gap-1 cursor-pointer"
            >
              <span>✕ 닫기 (Esc)</span>
            </button>
          </div>

          {/* Image Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 shadow-2xl bg-black/40"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt={selectedAlt || '고화질 원본 이미지'}
              className="max-w-full max-h-[85vh] object-contain select-none transition-all duration-200"
            />
          </div>

          <p className="text-slate-400 text-xs mt-3 font-medium">
            💡 바깥 영역 클릭 또는 ESC 키로 닫으실 수 있습니다
          </p>
        </div>
      )}
    </div>
  )
}
