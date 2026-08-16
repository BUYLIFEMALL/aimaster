'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'
import CategoryManagementModal from './_components/CategoryManagementModal'
import GoldButton from '@/components/ui/GoldButton'

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
  published_at: string
  reading_minutes?: number
  author_id: number
  author: Author | null
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

function getInitials(name: string): string {
  if (!name) return 'AB'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export default function HomePage() {
  const supabase = useMemo(() => createClient(), [])

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

  /* ---- Fetch posts ---- */
  useEffect(() => {
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
          .select('id, title, excerpt, published_at, reading_minutes, author_id')
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

        const authorIds = Array.from(new Set(postsData.map((p) => p.author_id))).filter(Boolean)
        const { data: authorsData } = await supabase
          .from('blog_authors')
          .select('*')
          .in('id', authorIds.length > 0 ? authorIds : [-1])
        const authorsMap = new Map(authorsData?.map((a) => [a.id, a]) ?? [])

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
            author: authorsMap.get(p.author_id) ?? null,
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
  }, [supabase, currentPage, activeCategory, searchQuery])

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
      {/* =================== HERO =================== */}
      <section className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight mb-3">
          주제, 키워드, 참고링크를 제시하면
        </h1>
        <p className="text-white/60 text-base mb-8">
          자동으로 검색엔진에 최적화된 블로그를 만들어 드립니다
        </p>

        {/* 검색 폼 (입력창 + 검색하기 버튼) */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-md mx-auto mb-8">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="블로그 제목으로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input-dark pl-9 py-2.5 text-sm"
            />
            <svg
              className="w-4 h-4 text-white/30 absolute left-3 top-1/2 -translate-y-1/2"
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
            className="px-4 py-2.5 bg-gradient-to-r from-gold to-gold-light text-black font-extrabold text-xs rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20 cursor-pointer flex-shrink-0 flex items-center gap-1.5"
          >
            <span>🔍</span>
            <span>검색하기</span>
          </button>
        </form>

        <Link href="/blog/write/ai-form">
          <GoldButton size="lg" className="gap-2.5">
            <span className="text-lg">✨</span>
            <span>AI 글쓰기 (자동 포스팅 생성)</span>
          </GoldButton>
        </Link>
      </section>

      {/* =================== MAIN CONTENT =================== */}
      <div className="space-y-8">
        {/* Category Section Header & Management Button */}
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-white tracking-tight">🏷️ 카테고리 탐색</span>
            <span className="text-[11px] font-bold text-white/40">({categories.length}개 분야)</span>
          </div>

          <button
            type="button"
            onClick={() => setIsManageModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all bg-gold/10 hover:bg-gold/20 text-gold border border-gold/20 flex items-center gap-1.5 cursor-pointer"
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
                ? 'bg-gradient-to-r from-gold to-gold-light text-black shadow-lg shadow-gold/20'
                : 'bg-white/5 text-white/60 border border-white/10 hover:border-gold/40 hover:text-white'
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
                    ? 'bg-gradient-to-r from-gold to-gold-light text-black shadow-lg shadow-gold/20'
                    : 'bg-white/5 text-white/60 border border-white/10 hover:border-gold/40 hover:text-white'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Posts Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card p-5 space-y-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/4" />
                <div className="h-6 bg-white/10 rounded w-3/4" />
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-2/3" />
                <div className="pt-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/10" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 glass-card space-y-3">
            <p className="text-base font-bold text-white">게시글이 존재하지 않습니다.</p>
            <p className="text-xs text-white/40">새로운 AI 자동 포스트를 작성해 보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/posts/${post.id}`}
                className="group glass-card hover:border-gold/40 p-6 transition-all duration-200 hover:-translate-y-1 flex flex-col justify-between no-underline"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    {post.categories.map((c) => (
                      <span
                        key={c.id}
                        className="text-[11px] font-extrabold text-gold bg-gold/10 px-2.5 py-1 rounded-md"
                      >
                        {c.name}
                      </span>
                    ))}
                  </div>

                  <h2 className="text-base font-bold text-white group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                    {post.title}
                  </h2>

                  <p className="text-xs text-white/50 line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-xs text-white/40">
                  <div className="flex items-center gap-2.5">
                    {post.author?.avatar_url ? (
                      <img
                        src={post.author.avatar_url}
                        alt={post.author.name}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gold/10 text-gold flex items-center justify-center font-bold text-[10px]">
                        {getInitials(post.author?.name || 'Dev')}
                      </div>
                    )}
                    <span className="font-semibold text-white/70">{post.author?.name || '에디터'}</span>
                  </div>

                  <span>{formatDate(post.published_at)}</span>
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
                      ? 'bg-gradient-to-r from-gold to-gold-light text-black shadow-lg shadow-gold/20'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {page}
                </button>
              ) : (
                <span key={idx} className="px-2 text-white/30 text-xs font-bold">
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
