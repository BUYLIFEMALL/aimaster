'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import CategoryManagementModal from './CategoryManagementModal'
import { ImageStorageNotice } from '@/blog/components/settings/ImageStorageNotice'
import { retentionDaysLeft } from '@/blog/utils/imageRetention'
import { APP_VERSION } from '@/utils/version'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface Category {
  id: number
  name: string
  slug: string
}

interface Post {
  id: number
  title: string
  excerpt: string
  published_at: string
  reading_minutes?: number
  categories: Category[]
}

const POSTS_PER_PAGE = 9

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '오늘'
  if (diffDays === 1) return '1일 전'
  if (diffDays < 7) return `${diffDays}일 전`

  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}월 ${day}일`
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const [currentPage, setCurrentPage] = useState(1)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)

  const categoriesRef = useRef<Category[]>([])
  categoriesRef.current = categories

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase
        .from('blog_categories')
        .select('*')
        .order('id', { ascending: true })

      if (data) setCategories(data)
    }
    fetchCategories()
  }, [supabase])

  /* ---- 로그인 확인: 게시글 관리 화면이라 로그인 없이는 접근할 수 없다 ---- */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }: any) => {
      const user = data?.user
      if (!user) {
        router.push(`${getBlogAuthPath()}?redirect=${getBlogBasePath()}`)
        return
      }
      setUserId(user.id)
    })
  }, [supabase, router])

  /* ---- Fetch posts (본인이 작성한 게시글만) ---- */
  useEffect(() => {
    if (!userId) return
    let ignore = false
    async function loadPosts() {
      try {
        setLoading(true)

        const from = (currentPage - 1) * POSTS_PER_PAGE
        const to = from + POSTS_PER_PAGE - 1

        let postIds: number[] | null = null
        if (activeCategory) {
          const cat = categoriesRef.current.find((c) => c.slug === activeCategory)
          if (cat) {
            const { data: pcData } = await supabase
              .from('blog_post_categories')
              .select('post_id')
              .eq('category_id', cat.id)
            postIds = pcData?.map((r) => r.post_id) ?? []
          }
        }

        let countQuery = supabase
          .from('blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
        if (postIds !== null) {
          if (postIds.length === 0) {
            if (!ignore) {
              setPosts([])
              setTotalCount(0)
              setLoading(false)
            }
            return
          }
          countQuery = countQuery.in('id', postIds)
        }
        if (searchQuery.trim()) {
          countQuery = countQuery.ilike('title', `%${searchQuery.trim()}%`)
        }
        const { count } = await countQuery
        if (ignore) return
        setTotalCount(count ?? 0)

        // ★ [핵심] 대용량 content 칼럼을 제외하고 라이트급 메타데이터만 쿼리 (Timeout 57014 방지)
        let postsQuery = supabase
          .from('blog_posts')
          .select('id, title, excerpt, published_at, reading_minutes')
          .eq('user_id', userId)
          .order('published_at', { ascending: false })
          .range(from, to)

        if (postIds !== null) {
          postsQuery = postsQuery.in('id', postIds)
        }
        if (searchQuery.trim()) {
          postsQuery = postsQuery.ilike('title', `%${searchQuery.trim()}%`)
        }
        const { data: postsData } = await postsQuery
        if (ignore) return

        if (!postsData || postsData.length === 0) {
          setPosts([])
          setLoading(false)
          return
        }

        const fetchedPostIds = postsData.map((p) => p.id)
        const { data: pcData } = await supabase
          .from('blog_post_categories')
          .select('post_id, category_id')
          .in('post_id', fetchedPostIds)

        const catIds = Array.from(new Set(pcData?.map((pc) => pc.category_id) ?? []))
        const { data: catsData } = await supabase
          .from('blog_categories')
          .select('*')
          .in('id', catIds.length > 0 ? catIds : [-1])
        const catsMap = new Map(catsData?.map((c) => [c.id, c]) ?? [])

        const postsWithRelations: Post[] = postsData.map((p) => {
          const postCatIds =
            pcData?.filter((pc) => pc.post_id === p.id).map((pc) => pc.category_id) ?? []
          return {
            ...p,
            categories: postCatIds.map((cid) => catsMap.get(cid)).filter(Boolean) as Category[],
          }
        })

        if (!ignore) {
          setPosts(postsWithRelations)
        }
      } catch (err) {
        console.error('[Load Posts Error]:', err)
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    loadPosts()
    return () => {
      ignore = true
    }
  }, [supabase, userId, currentPage, activeCategory, searchQuery])

  const handleCategoryClick = (slug: string | null) => {
    setActiveCategory(slug)
    setCurrentPage(1)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchQuery(searchInput)
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE)

  const getPaginationNumbers = () => {
    const pages: (number | string)[] = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      if (currentPage > 3) pages.push('...')
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      for (let i = start; i <= end; i++) pages.push(i)
      if (currentPage < totalPages - 2) pages.push('...')
      pages.push(totalPages)
    }
    return pages
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* =================== STUDIO HERO BANNER =================== */}
      <section className="studio-hero p-6 sm:p-8 mb-8">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                <span>✍️ BLOG PUBLISHING STUDIO</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 text-blue-700 border border-blue-200 shadow-xs">
                {APP_VERSION}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/guide"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-200 transition-all shadow-xs"
              >
                <span>📖 사용 매뉴얼</span>
              </Link>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white/80 hover:bg-white border border-slate-200 transition-all shadow-xs"
              >
                <span>🔑 API 키 설정</span>
              </Link>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight mb-2">
            주제·키워드 입력만으로 완성하는 SEO 최적화 블로그
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mb-6 leading-relaxed">
            멀티 AI(GPT-4o / Claude 3.5 Sonnet / Gemini 2.5 Flash) 기반 본문 작성, 나노바나나 고화질 삽화 자동 생성, Tiptap 리치 에디터 검수 및 크롬 확장 프로그램 연동까지 원스톱으로 지원합니다.
          </p>

          {/* 퀵 액션 버튼 & 검색 폼 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/write/ai-form"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 px-6 py-3 text-sm font-bold text-white transition-all shadow-md shadow-blue-500/25 hover:scale-[1.02]"
            >
              <span>✨ AI 글쓰기 (자동 생성)</span>
            </Link>
            <Link
              href="/candidates"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700 transition-all"
            >
              <span>🔍 글감·토픽 수집</span>
            </Link>

            {/* 인라인 검색 폼 */}
            <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 sm:ml-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="작성된 블로그 제목 검색..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 shadow-xs"
                />
                <svg
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
              >
                검색
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* =================== 3대 KPI 통계 카드 =================== */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">📝 총 작성 게시글</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600 text-sm">📊</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {loading ? "..." : `${totalCount}건`}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">회원 본인 소유의 전체 발행 글감</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">🏷️ 분류 카테고리</span>
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm">🗂️</span>
          </div>
          <div className="text-2xl font-black text-slate-900">
            {categories.length}개 분야
          </div>
          <p className="text-[11px] text-slate-500 mt-1">전문 기술 및 네이버/티스토리 카테고리</p>
        </div>

        <div className="stat-card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500">🛡️ 데이터 보안 및 보관</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600 text-sm">🔒</span>
          </div>
          <div className="text-lg font-black text-emerald-600">
            100% BYOK & RLS
          </div>
          <p className="text-[11px] text-slate-500 mt-1">회원 본인 소유 격리 / 생성일 기준 30일 보관</p>
        </div>
      </section>

      {/* =================== 4단계 파이프라인 가이드 바 =================== */}
      <section className="mb-8 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
            <span>⚡ 4단계 블로그 자동 발행 파이프라인</span>
          </span>
          <Link href="/guide" className="text-xs font-bold text-blue-600 hover:text-blue-800">
            매뉴얼 상세 보기 →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/60">
            <div className="text-[10px] font-black text-blue-600 uppercase">STEP 1</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">🔍 글감·토픽 수집</div>
            <div className="text-[11px] text-slate-500 mt-0.5">RSS·뉴스·쇼츠 트렌드</div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/60">
            <div className="text-[10px] font-black text-indigo-600 uppercase">STEP 2</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">✏️ AI 초안 & 나노바나나</div>
            <div className="text-[11px] text-slate-500 mt-0.5">멀티 모델 본문 & 고화질 삽화</div>
          </div>
          <div className="p-3 rounded-xl bg-violet-50/60 border border-violet-200/60">
            <div className="text-[10px] font-black text-violet-600 uppercase">STEP 3</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">📝 리치 에디터 검수</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Tiptap 서식 & 이미지 배치</div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/60">
            <div className="text-[10px] font-black text-emerald-600 uppercase">STEP 4</div>
            <div className="text-xs font-bold text-slate-900 mt-0.5">🚀 블로그 발행·연동</div>
            <div className="text-[11px] text-slate-500 mt-0.5">크롬 확장 프로그램 & 웹 발행</div>
          </div>
        </div>
      </section>

      {/* =================== MAIN CONTENT =================== */}
      <div className="space-y-8">
        {/* 글·이미지 30일 보관 안내(2026-10-01) */}
        <ImageStorageNotice compact />

        {/* Category Section Header & Management Button */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-900 tracking-tight">🏷️ 카테고리 탐색</span>
            <span className="text-[11px] font-bold text-slate-400">({categories.length}개 분야)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚙️ 카테고리 관리</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            type="button"
            onClick={() => handleCategoryClick(null)}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeCategory === null
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50'
            }`}
          >
            전체
          </button>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.slug)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 scale-105'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Posts List — 인스타/쓰레드처럼 한 행에 한 게시글씩 세로로 나열 */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-1/4" />
                <div className="h-5 bg-slate-100 rounded w-2/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-2xl space-y-3">
            <p className="text-base font-bold text-slate-900">아직 작성한 게시글이 없습니다.</p>
            <p className="text-xs text-slate-400">새로운 AI 자동 포스트를 작성해 보세요!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="group bg-white border border-slate-200 hover:border-blue-300 rounded-2xl p-5 transition-colors flex items-center gap-4 no-underline"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  {post.categories.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {post.categories.map((c) => (
                        <span
                          key={c.id}
                          className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                    {post.title}
                  </h2>

                  <p className="text-xs text-slate-500 truncate">{post.excerpt}</p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs text-slate-400">{formatDate(post.published_at)}</span>
                  {/* 30일 보관 — 삭제까지 남은 날(utils/imageRetention.ts) */}
                  {(() => {
                    const left = retentionDaysLeft(post.published_at)
                    return (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${left <= 7 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                        {left === 0 ? '오늘 자동삭제 예정' : `${left}일 후 자동삭제`}
                      </span>
                    )
                  })()}
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-6">
            {getPaginationNumbers().map((page, idx) =>
              typeof page === 'number' ? (
                <button
                  key={idx}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={idx} className="px-2 text-slate-300 text-xs font-bold">
                  {page}
                </span>
              )
            )}
          </div>
        )}
      </div>

      {/* ★ 카테고리 관리 팝업 모달 마운트 */}
      <CategoryManagementModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onCategoriesUpdated={async () => {
          const { data } = await supabase
            .from('blog_categories')
            .select('*')
            .order('id', { ascending: true })
          if (data) setCategories(data)
        }}
      />
    </div>
  )
}
