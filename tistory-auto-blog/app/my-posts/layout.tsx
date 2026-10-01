import { requireProgramAccess } from '@/utils/access'

// 회원 전용 화면: 로그인 + tistory-auto-blog 이용 권한을 서버에서 확인한다(2026-10-01 독립 배포 분리 때 추가 —
// 예전엔 루트 앱의 /blog 진입 화면이 대신 막아줬다). 두 줄은 권한 확인 결과가 캐시되지 않게 하는 필수 설정.
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function MyPostsLayout({ children }: { children: React.ReactNode }) {
  await requireProgramAccess()
  return <>{children}</>
}
