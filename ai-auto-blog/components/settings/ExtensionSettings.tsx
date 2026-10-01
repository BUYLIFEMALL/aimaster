'use client'

import { useEffect, useState } from 'react'
import extensionManifest from '../../extension/manifest.json'
import {
  createExtensionToken,
  listExtensionTokens,
  revokeExtensionToken,
  type ExtensionToken,
} from '@/blog/app/settings/extensionTokenActions'

// 설정 화면의 "🧩 네이버 블로그 입력 확장 프로그램" 박스 — 다운로드·설치 안내 + 연동 토큰 발급/폐기(2026-10-01).
// naver-blog-seo-studio의 ExtensionDownloadCard·ExtensionTokenManager를 BLOG 화면 스타일로 옮겼다.
const EXTENSION_VERSION = extensionManifest.version_name ?? `v${extensionManifest.version}`
const EXTENSION_ARCHIVE = `/downloads/ai-auto-blog-extension-${EXTENSION_VERSION}.zip`

export function ExtensionSettings() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [label, setLabel] = useState('')
  const [issued, setIssued] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    listExtensionTokens().then((result) => {
      if (result.tokens) setTokens(result.tokens)
      else if (result.error) setError(result.error)
    })
  }, [])

  async function issue() {
    setBusy(true)
    setError('')
    const result = await createExtensionToken(label)
    setBusy(false)
    if (!result.token || !result.item) return setError(result.error ?? '토큰 발급에 실패했습니다.')
    setIssued(result.token)
    setCopied(false)
    setLabel('')
    setTokens((current) => [result.item!, ...current])
  }

  async function revoke(id: string) {
    if (!confirm('이 토큰을 폐기하면 그 토큰을 넣은 확장 프로그램은 더 이상 연결되지 않습니다. 폐기할까요?')) return
    const result = await revokeExtensionToken(id)
    if (result.ok) setTokens((current) => current.filter((token) => token.id !== id))
    else setError(result.error ?? '토큰 폐기에 실패했습니다.')
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-zinc-900">🧩 네이버 블로그 입력 확장 프로그램 · {EXTENSION_VERSION}</h2>
        <p className="mt-1 text-xs leading-5 text-zinc-500">
          글 보기 화면에서 &quot;네이버로 보내기&quot;를 누른 글을, 네이버 블로그 글쓰기 화면에 제목·본문·이미지 순서대로 사람처럼 한 글자씩
          입력합니다. 이미지는 네이버에 파일로 직접 올라가서 보관 기간이 지나도 네이버 글에서는 사라지지 않습니다.
          <strong className="text-zinc-700"> 마지막 &quot;발행&quot; 버튼은 내용을 확인한 뒤 직접 눌러 주세요.</strong>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-800">1. 설치</p>
        <a
          href={EXTENSION_ARCHIVE}
          download
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white no-underline hover:bg-indigo-700"
        >
          확장 프로그램 다운로드 (ZIP)
        </a>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-zinc-600">
          <li>ZIP 파일을 내려받아 원하는 폴더에 압축을 풉니다.</li>
          <li>크롬 주소창에 <code className="rounded bg-zinc-100 px-1">chrome://extensions</code>를 입력하고 오른쪽 위 &quot;개발자 모드&quot;를 켭니다.</li>
          <li>&quot;압축해제된 확장 프로그램을 로드&quot;를 눌러 압축을 푼 폴더를 선택합니다.</li>
          <li>새 버전을 받았다면 같은 폴더에 덮어쓴 뒤 확장 프로그램 카드의 새로고침 버튼을 누릅니다.</li>
        </ol>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-800">2. 연동 토큰 발급 → 확장 프로그램에 붙여넣기</p>
        {issued && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-900">이 토큰은 지금 한 번만 보입니다. 바로 확장 프로그램의 &quot;연결&quot; 칸에 붙여넣으세요.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1 text-[11px] text-zinc-800">{issued}</code>
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(issued)
                  setCopied(true)
                }}
                className="rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-bold text-amber-900"
              >
                {copied ? '복사됨' : '복사'}
              </button>
            </div>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="토큰 이름 (선택, 예: 사무실 PC)"
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900"
          />
          <button
            type="button"
            onClick={issue}
            disabled={busy}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? '발급 중...' : '새 토큰 발급'}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {tokens.length > 0 && (
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
            {tokens.map((token) => (
              <li key={token.id} className="flex items-center justify-between gap-2 px-3 py-2">
                <span className="min-w-0">
                  <strong className="block truncate text-xs text-zinc-800">{token.label || 'BLOG 크롬 확장'}</strong>
                  <small className="text-[11px] text-zinc-500">
                    최근 사용: {token.last_used_at ? new Date(token.last_used_at).toLocaleString('ko-KR') : '없음'}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={() => revoke(token.id)}
                  className="shrink-0 rounded-lg border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600 hover:border-red-200 hover:text-red-600"
                >
                  폐기
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
