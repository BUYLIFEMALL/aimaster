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
          .select('is_admin, grade_id, grade:member_grades(sort_order)')
          .eq('id', user.id)
          .single()

        if (profile?.is_admin) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        const { data: program } = await supabase
          .from('programs')
          .select('id, required_grade_id')
          .eq('slug', 'ai-auto-blog')
          .single()

        if (!program) {
          alert('프로그램 정보를 찾을 수 없습니다.')
          router.push('/programs/ai-auto-blog')
          return
        }

        const now = new Date()

        // 3. 활성 구독 확인
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('status, expires_at')
          .eq('user_id', user.id)
          .eq('program_id', program.id)
        const hasActiveSub = (subs ?? []).some(
          (s) => s.status === 'active' && (!s.expires_at || new Date(s.expires_at) > now)
        )
        if (hasActiveSub) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        // 4. 개별 부여(user_program_access) 확인
        const { data: access } = await supabase
          .from('user_program_access')
          .select('expires_at')
          .eq('user_id', user.id)
          .eq('program_id', program.id)
          .maybeSingle()
        if (access && (!access.expires_at || new Date(access.expires_at) > now)) {
          setHasAccess(true)
          setLoading(false)
          return
        }

        // 5. 등급 기반 접근 확인 — 이전 코드는 이 단계 자체가 없어서, 등급을 아무리
        // 올려도 구독/개별부여가 없으면 무조건 막혔다(누락된 등급 체크 버그, 2026-09-03
        // a01039390116 계정 "일반 등급인데도 접근 안 됨" 신고로 발견). 다른 페이지들
        // (/dashboard, /programs/[slug])과 동일한 판정 방식으로 맞춤.
        if (!program.required_grade_id) {
          setHasAccess(true)
          setLoading(false)
          return
        }
        const userGrade = Array.isArray(profile?.grade) ? profile?.grade[0] : profile?.grade
        if (userGrade?.sort_order != null) {
          const { data: requiredGrade } = await supabase
            .from('member_grades')
            .select('sort_order')
            .eq('id', program.required_grade_id)
            .single()
          if (requiredGrade && userGrade.sort_order >= requiredGrade.sort_order) {
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
