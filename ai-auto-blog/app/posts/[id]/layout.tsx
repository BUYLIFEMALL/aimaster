import { requireProgramAccess } from '@/utils/access'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default async function PostDetailLayout({ children }: { children: React.ReactNode }) {
  await requireProgramAccess()
  return <>{children}</>
}
