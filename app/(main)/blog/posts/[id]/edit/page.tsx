'use client'

import { useEffect, useState, use } from 'react'
import PostEditPage from '@/blog/app/posts/[id]/edit/page'

export default function BlogEditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return <PostEditPage params={Promise.resolve(resolvedParams)} />
}
