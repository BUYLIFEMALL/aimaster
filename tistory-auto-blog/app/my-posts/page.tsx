'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getBlogBasePath } from '@/blog/utils/basePath'

// "게시글 관리" 기능은 홈(/blog)이 흡수했다 — 로그인 사용자 본인 글만 세로 리스트로
// 보여주는 화면이 이제 홈 자체이므로, 기존에 이 경로로 저장된 링크/북마크는 홈으로 보낸다.
export default function MyPostsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace(getBlogBasePath() || '/')
  }, [router])

  return null
}
