import { redirect } from 'next/navigation'
import { checkProgramAccessApi } from '@/blog/utils/access'
import { ExtensionConnectButton } from '@/blog/components/settings/ExtensionConnectButton'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

// 2026-10-23: 확장 사이드패널 「자동 연결」 버튼이 여는 화면. 로그인 → 연결 코드 자동 발급 → 확장에 전달 → 확장이 탭을 닫는다.
export default async function ExtensionConnectPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from } = await searchParams
  const auto = from === 'extension'
  const access = await checkProgramAccessApi()
  if (!access.allowed) {
    if (access.status === 401) redirect(`/auth?redirect=${encodeURIComponent(`/extension-connect${auto ? '?from=extension' : ''}`)}`)
    redirect('https://www.buylife.xyz/programs/ai-auto-blog')
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900">확장 프로그램 연결</h1>
      <p className="mb-6 text-sm text-zinc-600">
        버튼 한 번으로 이 계정 전용 연결 코드를 만들어 이 브라우저의 BLOG 확장(네이버 블로그 입력기)에 바로 넣습니다. 코드를 복사하거나 붙여 넣을 필요가 없습니다.
      </p>
      <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
        <ExtensionConnectButton auto={auto} />
      </section>
    </div>
  )
}
