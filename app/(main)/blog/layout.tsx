'use client'

import { useEffect } from 'react'

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 블로그 영역 진입 시 브라우저 body 전체 배경을 100% 순백색(#ffffff)으로 강제 지정
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

  return (
    <div className="w-full min-h-screen bg-white text-zinc-900 font-sans blog-light-scope">
      {children}
    </div>
  )
}
