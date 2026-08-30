import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function WriteRedirectPage() {
  redirect('/blog/write/ai-form')
  return null
}
