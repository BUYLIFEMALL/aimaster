'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BlogSidebar from './BlogSidebar'
import { createClient } from '@/utils/supabase/client'

// 2026-10-01 독립 배포 분리 때 루트 app/(embedded)/blog/layout.tsx의 사이드바 표시 규칙을 옮겨왔다.
// 게시글 관리 홈(/)·AI 글쓰기·글감 수집·대시보드·설정은 항상 사이드바를 붙인다.
// /posts/[id](게시글 보기)는 비로그인 방문자도 보는 공개 글 화면이라, 로그인한 회원에게만 사이드바를 붙이고
// 비로그인 방문자에게는 그 페이지 자체의 공개 헤더만 보여준다. 로그인(/auth)·안내 페이지는 사이드바 없이 보여준다.
export default function BlogShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  const isPostsRoute = pathname.startsWith('/posts') || pathname.startsWith('/my-posts')

  const showSidebar =
    pathname === '/' ||
    pathname.startsWith('/write') ||
    pathname.startsWith('/candidates') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    (isPostsRoute && isLoggedIn)

  if (showSidebar) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <BlogSidebar />
        <div className="min-w-0 flex-1 bg-slate-50">{children}</div>
      </div>
    )
  }

  return <div className="w-full min-h-screen bg-white text-zinc-900 font-sans">{children}</div>
}
