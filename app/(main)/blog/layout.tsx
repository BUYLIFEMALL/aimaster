'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import BlogSidebar from '@/components/layout/BlogSidebar'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // /blog(게시글 관리 홈), /blog/write/ai-form(AI 글쓰기), /blog/candidates(게시글 주제 수집),
  // /blog/dashboard(대시보드)는 사이드바(BlogSidebar)를 갖는 라우트이며, 나머지 블로그 하위
  // 페이지(/blog/posts/[id] 등)와 동일한 화이트 라이트 테마("AutoBlog" 톤)를 쓴다. 사이드바
  // 바깥의 루트 헤더/푸터(다크골드)는 사이트 전체 공통 프레임으로 그대로 유지된다.
  const showSidebar =
    pathname === '/blog' ||
    pathname.startsWith('/blog/write') ||
    pathname.startsWith('/blog/candidates') ||
    pathname.startsWith('/blog/dashboard')

  useEffect(() => {
    if (showSidebar) return

    // 블로그 하위 페이지 진입 시 브라우저 body 전체 배경을 100% 순백색(#ffffff)으로 강제 지정
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
  }, [showSidebar])

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
