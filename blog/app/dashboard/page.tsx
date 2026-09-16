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
  const [supabase, setSupabase] = useState<any>(null)
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient())
      setBasePath(getBlogBasePath())
    }
  }, [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
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

    supabase.auth.getUser().then(async ({ data }: any) => {
      const user = data?.user
      if (!user) {
        router.push(`${getBlogAuthPath()}?redirect=${getBlogBasePath()}/dashboard`)
        return
      }
      setUserEmail(user.email ?? null)

      const [postsRes, candidatesRes, categoriesRes, programRes] = await Promise.all([
        supabase
          .from('blog_posts')
          .select('id, title, published_at, created_at', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('blog_candidates')
          .select('id, title, keywords', { count: 'exact' })
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3),
        supabase.from('blog_categories').select('id', { count: 'exact', head: true }),
        // 대시보드 상단 설명 박스 — AIMaster 루트의 프로그램 소개(메인 페이지
        // programs.description/short_desc)를 그대로 가져와 보여준다(2026-09-13 요청).
        supabase.from('programs').select('description, short_desc').eq('slug', 'ai-auto-blog').maybeSingle(),
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
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={basePath || '/'} className="text-xl font-black text-indigo-600 no-underline">
            BLOG(원문)생성 자동화
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {userEmail ? <span>{userEmail}</span> : <Link href={getBlogAuthPath()}>로그인</Link>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">대시보드</h1>
          <div className="flex gap-2">
            <Link
              href={`${basePath}/candidates`}
              className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-xl shadow-md shadow-green-500/20 transition-all"
            >
              🔍 게시글 주제 수집
            </Link>
            <Link
              href={`${basePath}/write/ai-form`}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
            >
              ✨ AI 글쓰기
            </Link>
          </div>
        </div>

        {(programDescription || programShortDesc) && (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
            {splitIntoSentenceParagraphs(programDescription || programShortDesc || '').map((sentence, i) => (
              <p key={i} className="mb-2 text-sm leading-relaxed text-slate-600 last:mb-0">
                {sentence}
              </p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-extrabold text-slate-900">{postCount}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">내 게시글</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-extrabold text-slate-900">{candidateCount}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">수집된 글감</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="text-2xl font-extrabold text-slate-900">{categoryCount}</div>
            <div className="mt-1 text-xs font-semibold text-slate-500">전체 카테고리</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-8">
          <h2 className="mb-3 text-sm font-bold text-slate-900">사용방법</h2>
          <ol className="list-inside list-decimal space-y-3 text-sm text-slate-600">
            <li>
              <Link href={`${basePath}/settings`} className="font-medium text-blue-600 hover:underline">
                API키등록·플랫폼연동
              </Link>
              에서 본인 Gemini(필수, 글/이미지 생성)·Perplexity(글감 수집) 키를 등록합니다.
            </li>
            <li>
              <Link href={`${basePath}/candidates`} className="font-medium text-blue-600 hover:underline">
                게시글 주제 수집
              </Link>
              에서 최신 트렌드·키워드로 글감 후보를 모으거나, 바로 AI 글쓰기로 넘어가 주제를 직접
              입력해도 됩니다.
            </li>
            <li>
              <Link href={`${basePath}/write/ai-form`} className="font-medium text-blue-600 hover:underline">
                AI 글쓰기
              </Link>
              에서 분위기·대상 독자·목표 분량·키워드·참고 링크 등을 지정하면 AI가 제목·본문과
              대표 이미지를 만들어줍니다.
            </li>
            <li>
              <Link href={basePath || '/'} className="font-medium text-blue-600 hover:underline">
                게시글 관리
              </Link>
              에서 만들어진 글을 확인·수정하고 카테고리를 지정해 게시합니다.
            </li>
          </ol>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl mb-6">
          <div className="border-b border-slate-100 p-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">최근 게시글</h2>
            <Link href={basePath || '/'} className="text-xs font-semibold text-blue-600 hover:underline">
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-slate-400">불러오는 중...</p>
          ) : recentPosts.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">아직 작성한 게시글이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPosts.map((post) => (
                <li key={post.id} className="p-4 flex items-center justify-between gap-4">
                  <Link href={`${basePath}/posts/${post.id}`} className="min-w-0 flex-1 truncate text-sm text-slate-900 hover:underline">
                    {post.title}
                  </Link>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(post.published_at ?? post.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl">
          <div className="border-b border-slate-100 p-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">최근 수집된 글감</h2>
            <Link href={`${basePath}/candidates`} className="text-xs font-semibold text-blue-600 hover:underline">
              전체 보기 →
            </Link>
          </div>
          {loading ? (
            <p className="p-4 text-sm text-slate-400">불러오는 중...</p>
          ) : recentCandidates.length === 0 ? (
            <p className="p-4 text-sm text-slate-500">아직 수집된 글감이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentCandidates.map((c) => {
                const writeParams = new URLSearchParams({ topic: c.title })
                if (c.keywords && c.keywords.length > 0) writeParams.set('keywords', c.keywords.join(','))
                return (
                  <li key={c.id} className="p-4 flex items-center justify-between gap-4">
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-900">{c.title}</span>
                    <Link
                      href={`${basePath}/write/ai-form?${writeParams.toString()}`}
                      className="shrink-0 text-xs font-bold text-blue-600 hover:underline"
                    >
                      이 주제로 글쓰기
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </main>
    </div>
  )
}
