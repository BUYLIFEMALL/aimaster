import { requireProgramAccess } from '@/utils/access'
import HomePage from './_components/HomePage'

// 게시글 관리 홈(회원 전용). 화면 본체는 _components/HomePage.tsx(클라이언트 컴포넌트)에 있고,
// 여기서는 로그인 + tistory-auto-blog 이용 권한을 서버에서 먼저 확인한다(2026-10-01 독립 배포 분리).
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function Page() {
  await requireProgramAccess()
  return <HomePage />
}
