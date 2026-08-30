import { requireProgramAccess } from '@/utils/access'

// force-dynamic이 없으면 이 레이아웃이 빌드 시점에 캐시돼서, 실제 로그인/권한 상태와
// 무관하게 굳어버린 스냅샷을 모든 사용자에게 그대로 보여준다(X-Vercel-Cache: HIT로 확인).
// 루트 CLAUDE.md의 "Supabase 호출이 있는 모든 페이지는 force-dynamic 필수" 원칙 — 여기서
// 실제로 빠져있던 걸 bugang530 계정의 "접근권한 없음" 신고로 발견(2026-08-30).
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function WriteLayout({ children }: { children: React.ReactNode }) {
  await requireProgramAccess()
  return <>{children}</>
}
