'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'

interface MyPost {
  id: number
  title: string
  excerpt: string | null
  published_at: string
  created_at: string
  like_count: number
  reading_minutes: number | null
}

export default function MyPostsPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient())
    }
  }, [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [posts, setPosts] = useState<MyPost[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getUser().then(async ({ data }: any) => {
      const user = data?.user
      if (!user) {
        router.push('/auth?redirect=/my-posts')
        return
      }
      setUserEmail(user.email ?? null)

      const { data: rows, error } = await supabase
        .from('blog_posts')
        .select('id, title, excerpt, published_at, created_at, like_count, reading_minutes')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        setErrorMsg('게시글 목록을 불러오는 중 오류가 발생했습니다.')
      } else {
        setPosts(rows ?? [])
      }
      setLoading(false)
    })
  }, [supabase, router])

  const handleDelete = async (id: number) => {
    if (!confirm('이 게시글을 삭제하시겠습니까?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '삭제에 실패했습니다.')
      }
      setPosts((prev) => prev.filter((p) => p.id !== id))
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/my-posts" className="text-xl font-black text-indigo-600 no-underline">
            AutoBlog
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {userEmail ? <span>{userEmail}</span> : <Link href="/auth">로그인</Link>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">내 블로그 게시물</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">내가 작성한 글만 모아서 보여줍니다.</p>
          </div>
          <Link
            href="/write/ai-form"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
          >
            ✨ 새 글 작성
          </Link>
        </div>

        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : errorMsg ? (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{errorMsg}</div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl">
            <p className="text-sm text-slate-500">아직 작성한 게시글이 없습니다.</p>
            <Link href="/write/ai-form" className="mt-3 inline-block text-sm font-bold text-blue-600 hover:underline">
              첫 글 작성하러 가기
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li
                key={post.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-blue-300 transition-colors"
              >
                <Link href={`/posts/${post.id}`} className="min-w-0 flex-1">
                  <h2 className="text-base font-bold text-slate-900 truncate">{post.title}</h2>
                  {post.excerpt && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{post.excerpt}</p>
                  )}
                  <p className="text-[11px] text-slate-400 mt-2">
                    {new Date(post.published_at ?? post.created_at).toLocaleString('ko-KR')}
                    {post.reading_minutes ? ` · ${post.reading_minutes}분 읽기` : ''}
                    {typeof post.like_count === 'number' ? ` · 좋아요 ${post.like_count}` : ''}
                  </p>
                </Link>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Link
                    href={`/posts/${post.id}/edit`}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    수정
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={deletingId === post.id}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
                  >
                    {deletingId === post.id ? '삭제 중...' : '삭제'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
