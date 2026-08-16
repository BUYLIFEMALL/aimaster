'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
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

        // 1. 비로그인 사용자
        if (!user) {
          alert('해당 프로그램 이용을 위해 먼저 로그인 및 구독 신청이 필요합니다.')
          router.push('/programs/ai-auto-blog')
          return
        }

        // 2. 관리자 확인
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .single()

        if (profile?.is_admin) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        // 3. 구독/권한 확인 (user_program_access 또는 active subscriptions)
        const { data: program } = await supabase
          .from('programs')
          .select('id')
          .eq('slug', 'ai-auto-blog')
          .single()

        if (program) {
          const { data: access } = await supabase
            .from('user_program_access')
            .select('*')
            .eq('user_id', user.id)
            .eq('program_id', program.id)
            .single()

          if (access) {
            setHasAccess(true)
            setLoading(false)
            return
          }
        }

        // 권한이 없거나 미구독 사용자인 경우 상세 페이지로 유도
        alert('프로그램 접근 권한이 없습니다. 구독 신청 후 이용해 주세요!')
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
