'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import { splitIntoSentenceParagraphs } from '@/blog/utils/formatProgramDescription'

interface RecentPost {
  id: number
  title: string
  published_at: string
  created_at: string
}

interface RecentCandidate {
  id: string
  title: string
  keywords: string[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<ReturnType<typeof createClient> | null>(null)
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 마운트 후 1회 초기화(서버 렌더/정적 프리렌더 단계에서는 브라우저 값을 쓸 수 없음)
      setSupabase(createClient())
      setBasePath(getBlogBasePath())
    }
  }, [])

  const [loading, setLoading] = useState(true)
  const [postCount, setPostCount] = useState(0)
  const [candidateCount, setCandidateCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [recentCandidates, setRecentCandidates] = useState<RecentCandidate[]>([])
  const [programDescription, setProgramDescription] = useState<string | null>(null)
  const [programShortDesc, setProgramShortDesc] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getUser().then(async ({ data }) => {
      const user = data?.user
      if (!user) {
        router.push(`${getBlogAuthPath()}?redirect=${getBlogBasePath()}/dashboard`)
        return
      }

      const [postsRes, candidatesRes, categoriesRes, programRes] = await Promise.all([
        supabase
          .from('tistory_posts')
          .select('id, title, published_at, created_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('tistory_candidates')
          .select('id, title, keywords', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('tistory_categories').select('id', { count: 'exact', head: true }),
        supabase.from('programs').select('description, short_desc').eq('slug', 'tistory-auto-blog').maybeSingle(),
      ])

      setRecentPosts(postsRes.data ?? [])
      setPostCount(postsRes.count ?? 0)
      setRecentCandidates(candidatesRes.data ?? [])
      setCandidateCount(candidatesRes.count ?? 0)
      setCategoryCount(categoriesRes.count ?? 0)
      setProgramDescription(programRes.data?.description ?? null)
      setProgramShortDesc(programRes.data?.short_desc ?? null)
      setLoading(false)
    })
  }, [supabase, router])

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* 상단 헤더 & 빠른 액션 버튼 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">대시보드</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              티스토리(원문) 자동 포스팅 진행 현황과 주요 지표를 확인하세요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={`${basePath}/candidates`}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              🔍 1단계: 주제 수집
            </Link>
            <Link
              href={`${basePath}/write/ai-form`}
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              ✏️ 2단계: AI 글쓰기
            </Link>
            <Link
              href="/guide"
              className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold rounded-xl shadow-2xs transition-all active:scale-95"
            >
              📖 사용 매뉴얼
            </Link>
          </div>
        </div>

        {/* 프로그램 공식 설명 카드 */}
        {(programDescription || programShortDesc) && (
          <div className="mb-8 rounded-2xl border border-orange-200/70 bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 p-5 shadow-2xs">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-orange-700">
              <span>💡</span>
              <span>프로그램 소개</span>
            </div>
            {splitIntoSentenceParagraphs(programDescription || programShortDesc || '').map((sentence, i) => (
              <p key={i} className="mb-2 text-xs sm:text-sm leading-relaxed text-slate-700 last:mb-0">
                {sentence}
              </p>
            ))}
          </div>
        )}

        {/* 핵심 KPI 카드 3종 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">내 게시글</span>
              <span className="text-xl">📝</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '-' : postCount}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">작성 완료된 전체 글</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">수집된 글감 후보</span>
              <span className="text-xl">🔍</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-orange-600 tracking-tight">
              {loading ? '-' : candidateCount}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">트렌드·쇼츠 수집 주제</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500">티스토리 카테고리</span>
              <span className="text-xl">📁</span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-slate-900 tracking-tight">
              {loading ? '-' : categoryCount}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">등록된 카테고리 수</p>
          </div>
        </div>

        {/* 5단계 파이프라인 빠른 가이드 배너 */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>🚀</span>
              <span>티스토리 자동화 3대 핵심 작업 순서</span>
            </h2>
            <Link href="/guide" className="text-xs font-bold text-orange-600 hover:text-orange-700">
              상세 매뉴얼 보기 →
            </Link>
          </div>
          <ol className="list-inside list-decimal space-y-2.5 text-xs sm:text-sm text-slate-600">
            <li className="leading-relaxed">
              <Link href={`${basePath}/settings`} className="font-semibold text-orange-600 hover:underline">
                API키등록·플랫폼연동
              </Link>
              에서 본인 Gemini(글/이미지)·Perplexity(글감)·YouTube API 키와 크롬 확장을 등록합니다.
            </li>
            <li className="leading-relaxed">
              <Link href={`${basePath}/candidates`} className="font-semibold text-orange-600 hover:underline">
                게시글 주제 수집
              </Link>
              에서 HTTP URL, RSS 피드, 트렌드 검색, 유튜브 쇼츠 떡상 분석으로 흥행 주제를 모읍니다.
            </li>
            <li className="leading-relaxed">
              <Link href={`${basePath}/write/ai-form`} className="font-semibold text-orange-600 hover:underline">
                AI 글쓰기
              </Link>
              에서 분위기와 AI 모델을 선택해 고품질 초안을 생성하고, 상세 보기에서 티스토리로 1-Click 자동 전송합니다.
            </li>
          </ol>
        </div>

        {/* 최근 게시글 및 글감 미리보기 그리드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 최근 게시글 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">최근 작성 게시글</h3>
              <Link href="/" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                전체보기 →
              </Link>
            </div>
            {recentPosts.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">아직 작성된 게시글이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentPosts.map((post) => (
                  <li key={post.id} className="py-2.5">
                    <Link
                      href={`/posts/${post.id}`}
                      className="group flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <span className="truncate font-medium text-slate-700 group-hover:text-orange-600">
                        {post.title}
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-400">
                        {new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 최근 수집된 글감 */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">최근 수집된 글감</h3>
              <Link href="/candidates" className="text-xs font-semibold text-orange-600 hover:text-orange-700">
                전체보기 →
              </Link>
            </div>
            {recentCandidates.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400">아직 수집된 글감이 없습니다.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentCandidates.map((cand) => (
                  <li key={cand.id} className="py-2.5">
                    <Link
                      href={`/write/ai-form?candidateId=${cand.id}`}
                      className="group flex items-center justify-between gap-3 text-xs sm:text-sm"
                    >
                      <span className="truncate font-medium text-slate-700 group-hover:text-orange-600">
                        {cand.title}
                      </span>
                      <span className="shrink-0 text-[10px] rounded bg-orange-50 px-1.5 py-0.5 font-bold text-orange-600 group-hover:bg-orange-100">
                        글쓰기 →
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
