'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { checkProgramAccess } from '@/lib/access/checkProgramAccess'
import BlogMainPage from '@/blog/app/page'

export default function BlogRoutePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    async function checkAccessPermission() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          alert('해당 프로그램 이용을 위해 먼저 로그인 및 구독 신청이 필요합니다.')
          router.push('/programs/ai-auto-blog')
          return
        }

        // 판정 규칙(구독 -> 개별부여 -> 등급, 관리자/정지 포함)은 lib/access/checkProgramAccess.ts
        // 하나로 통일해서 쓴다 — 이 화면이 예전에 등급/구독 체크를 통째로 빠뜨린 채 자체
        // 로직을 따로 짜서 배포됐던 버그(2026-09-03, a01039390116 신고로 발견)의 재발 방지.
        const access = await checkProgramAccess(supabase, user.id, 'ai-auto-blog')
        if (access.allowed) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        if (access.reason === 'not_found') {
          alert('프로그램 정보를 찾을 수 없습니다.')
        } else {
          alert('프로그램 접근 권한이 없습니다. 구독 신청 후 이용해 주세요!')
        }
        router.push('/programs/ai-auto-blog')
      } catch (err) {
        console.error('[Blog Access Check Error]:', err)
        // 기본 렌더링 허용 (경고 메시지 후 진입)
        setHasAccess(true)
        setLoading(false)
      }
    }

    checkAccessPermission()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-white/60">구독 및 프로그램 권한을 확인 중입니다...</p>
        </div>
      </div>
    )
  }

  if (!hasAccess) return null

  return (
    <div className="w-full min-h-screen">
      <BlogMainPage />
    </div>
  )
}
