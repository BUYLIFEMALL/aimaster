'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BlogSidebar from '@/components/layout/BlogSidebar'
import { createClient } from '@/lib/supabase/client'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  // /blog는 다른 (main) 그룹 페이지들과 달리 루트 공통 헤더/푸터(다크골드)를 쓰지 않는다 —
  // threads-nu-dusky.vercel.app/dashboard처럼 상단 탑 없이 서브 자동화 프로그램 화면만 바로
  // 보이도록 app/(embedded)/blog로 분리했다(app/(main) 그룹 밖이라 MainLayout의 Header/Footer를
  // 상속하지 않음). /blog(게시글 관리 홈), /blog/write/ai-form(AI 글쓰기), /blog/candidates
  // (게시글 주제 수집), /blog/dashboard(대시보드), /blog/settings(API 키 설정)는 항상
  // 사이드바(BlogSidebar)를 갖는 라우트다.
  // /blog/posts/[id](게시글 보기/수정)는 비로그인 방문자도 볼 수 있는 실제 공개 블로그 글
  // 화면이라, 관리자 전용 메뉴(글감 수집/AI 글쓰기/로그아웃 등)가 들어간 사이드바를 모두에게
  // 보여주면 안 된다 — 로그인한 운영자가 볼 때만("다른 자동화 프로그램처럼 좌측에 번호
  // 메뉴가 보여야 한다"는 2026-09-16 요청) 사이드바를 붙이고, 비로그인 공개 방문자에게는
  // 기존처럼 해당 페이지 자체의 퍼블릭 헤더만 보여준다.
  const isPostsRoute = pathname.startsWith('/blog/posts') || pathname.startsWith('/blog/my-posts')

  const showSidebar =
    pathname === '/blog' ||
    pathname.startsWith('/blog/write') ||
    pathname.startsWith('/blog/candidates') ||
    pathname.startsWith('/blog/dashboard') ||
    pathname.startsWith('/blog/settings') ||
    (isPostsRoute && isLoggedIn)

  useEffect(() => {
    // 루트 body는 다크 테마(bg-dark text-white)라서, 헤더/푸터 없이 바로 노출되는 블로그
    // 화면 가장자리(오버스크롤 등)에 다크 배경이 비치지 않도록 항상 순백색으로 강제 지정한다.
    const originalBg = document.body.style.backgroundColor
    const originalColor = document.body.style.color

    document.body.style.backgroundColor = '#ffffff'
    document.body.style.color = '#0f172a'
    document.body.classList.add('bg-white')

    return () => {
      document.body.style.backgroundColor = originalBg
      document.body.style.color = originalColor
      document.body.classList.remove('bg-white')
    }
  }, [])

  if (showSidebar) {
    return (
      <div className="flex min-h-screen flex-col md:flex-row">
        <BlogSidebar />
        <div className="min-w-0 flex-1 bg-slate-50">{children}</div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900 font-sans blog-light-scope">
      {children}
    </div>
  )
}
