'use client'

import PostDetailPage from '@/blog/app/posts/[id]/page'
import { use } from 'react'

export default function BlogDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  return <PostDetailPage params={Promise.resolve(resolvedParams)} />
}
