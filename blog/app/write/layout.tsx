import { requireProgramAccess } from '@/utils/access'

export default async function WriteLayout({ children }: { children: React.ReactNode }) {
  await requireProgramAccess()
  return <>{children}</>
}
