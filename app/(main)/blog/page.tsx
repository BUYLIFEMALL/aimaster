'use client'

import { useEffect, useState } from 'react'
import BlogMainPage from '@/blog/app/page'

export default function BlogRoutePage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-300">AI 블로그 자동화 플랫폼을 로딩 중입니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-900">
      <BlogMainPage />
    </div>
  )
}
