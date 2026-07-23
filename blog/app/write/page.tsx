import { redirect } from 'next/navigation'

export default function WriteRedirectPage() {
  redirect('/blog/write/ai-form')
  return null
}
