'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import BlogSidebar from '@/components/layout/BlogSidebar'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // /blog는 다른 (main) 그룹 페이지들과 달리 루트 공통 헤더/푸터(다크골드)를 쓰지 않는다 —
  // threads-nu-dusky.vercel.app/dashboard처럼 상단 탑 없이 서브 자동화 프로그램 화면만 바로
  // 보이도록 app/(embedded)/blog로 분리했다(app/(main) 그룹 밖이라 MainLayout의 Header/Footer를
  // 상속하지 않음). /blog(게시글 관리 홈), /blog/write/ai-form(AI 글쓰기), /blog/candidates
  // (게시글 주제 수집), /blog/dashboard(대시보드)는 사이드바(BlogSidebar)를 갖는 라우트이며,
  // 나머지 블로그 하위 페이지(/blog/posts/[id] 등)와 동일한 화이트 라이트 테마("AutoBlog" 톤)를 쓴다.
  const showSidebar =
    pathname === '/blog' ||
    pathname.startsWith('/blog/write') ||
    pathname.startsWith('/blog/candidates') ||
    pathname.startsWith('/blog/dashboard')

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
