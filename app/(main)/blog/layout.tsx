'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  // 블로그 첫페이지(/blog)는 다른 서브프로젝트와 동일하게 루트 사이트의 다크골드 테마를
  // 그대로 쓴다. 글 목록/작성 등 하위 페이지(/blog/posts/[id], /blog/write 등)는 기존에
  // 만들어둔 화이트 라이트 테마를 그대로 유지한다 (전면 개편 전까지는 여기만 예외 처리).
  const isHomePage = pathname === '/blog'

  useEffect(() => {
    if (isHomePage) return

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
  }, [isHomePage])

  if (isHomePage) {
    return <div className="w-full min-h-screen">{children}</div>
  }

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900 font-sans blog-light-scope">
      {children}
    </div>
  )
}
