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
const EXTENSION_ARCHIVE = `/downloads/ai-auto-blog-extension-latest.zip`
// 설치·업데이트 상태 안내(naver-blog-seo-studio ExtensionDownloadCard와 같은 방식). 웹은 확장 설치 여부를 직접 알 수 없어서
// 이 브라우저에 "내려받음/설치 완료 표시"를 기록해 두고, 프로그램이 새 버전이 되면(=확장도 새 버전) 업데이트 필요로 안내한다.
const INSTALLED_VERSION_KEY = 'ai-auto-blog-extension-version'
const DOWNLOAD_MARKER_KEY = 'ai-auto-blog-extension-downloaded'

export function ExtensionSettings() {
  const [tokens, setTokens] = useState<ExtensionToken[]>([])
  const [label, setLabel] = useState('')
  const [issued, setIssued] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  const [installedVersion, setInstalledVersion] = useState<string | null>(null)

  useEffect(() => {
    try {
      setDownloaded(window.localStorage.getItem(DOWNLOAD_MARKER_KEY) === EXTENSION_VERSION)
      setInstalledVersion(window.localStorage.getItem(INSTALLED_VERSION_KEY))
    } catch { /* 저장소를 못 쓰는 브라우저 */ }
  }, [])

  const isUpdate = installedVersion !== null && installedVersion !== EXTENSION_VERSION
  const isInstalled = installedVersion === EXTENSION_VERSION
  const statusText = isInstalled
    ? `설치 완료 표시 · ${EXTENSION_VERSION}`
    : isUpdate
      ? `업데이트 필요 · 설치된 버전 ${installedVersion} → 최신 ${EXTENSION_VERSION}`
      : downloaded
        ? '설치 진행 중 · 크롬에 확장을 추가한 뒤 아래 완료 표시를 눌러 주세요'
        : '설치 전 · ZIP 다운로드 필요'

  function markDownloadStarted() {
    try { window.localStorage.setItem(DOWNLOAD_MARKER_KEY, EXTENSION_VERSION) } catch { /* ignore */ }
    setDownloaded(true)
  }

  function markInstalled() {
    if (!confirm('chrome://extensions에서 압축해제된 확장 프로그램을 로드했거나, 기존 확장을 새로고침했나요?')) return
    try { window.localStorage.setItem(INSTALLED_VERSION_KEY, EXTENSION_VERSION) } catch { /* ignore */ }
    setInstalledVersion(EXTENSION_VERSION)
  }

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
          글 보기 화면에서 &quot;네이버 입력기로 보내기&quot;를 누르면, 확장 프로그램이 <strong className="text-zinc-700">보낸 뒤 30분 안에 자동으로</strong> 네이버 블로그 새 글쓰기 화면을 열어
          제목·본문·이미지를 순서대로 사람처럼 한 글자씩 입력하고, 저장해 둔 카테고리·태그까지 넣어 발행 직전 상태로 준비합니다. 이미지는 네이버에 파일로 직접 올라가서
          보관 기간이 지나도 네이버 글에서는 사라지지 않습니다.
          <strong className="text-zinc-700"> 마지막 &quot;발행&quot; 버튼은 내용을 확인한 뒤 직접 눌러 주세요.</strong>
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-800">1. 설치 · 업데이트</p>
        <p className="flex items-center gap-2 text-xs font-semibold text-zinc-700" role="status" aria-live="polite">
          <span className={`inline-block h-2 w-2 rounded-full ${isInstalled ? 'bg-emerald-500' : isUpdate ? 'bg-red-500' : downloaded ? 'bg-amber-400' : 'bg-zinc-300'}`} />
          {statusText}
        </p>
        {isUpdate && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs leading-5 text-red-700">
            새 버전이 나왔습니다. 아래에서 최신 ZIP을 다시 내려받아 같은 폴더에 덮어쓴 뒤, 확장 프로그램 관리 화면에서 새로고침 버튼을 눌러 주세요.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={EXTENSION_ARCHIVE}
            download
            onClick={markDownloadStarted}
            className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white no-underline hover:bg-indigo-700"
          >
            {isUpdate ? `최신 버전(${EXTENSION_VERSION}) 다시 다운로드` : downloaded || isInstalled ? 'ZIP 다시 다운로드' : `확장 프로그램 다운로드 (${EXTENSION_VERSION})`}
          </a>
          {downloaded && !isInstalled && (
            <button
              type="button"
              onClick={markInstalled}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50"
            >
              크롬 설치 후 완료 표시
            </button>
          )}
        </div>
        <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-zinc-600">
          <li>ZIP 파일을 내려받아 원하는 폴더에 압축을 풉니다.</li>
          <li>크롬 주소창에 <code className="rounded bg-zinc-100 px-1">chrome://extensions</code>를 입력하고 오른쪽 위 &quot;개발자 모드&quot;를 켭니다.</li>
          <li>&quot;압축해제된 확장 프로그램을 로드&quot;를 눌러 압축을 푼 폴더를 선택합니다.</li>
          <li>새 버전을 받았다면 같은 폴더에 덮어쓴 뒤 확장 프로그램 카드의 새로고침 버튼을 누릅니다.</li>
        </ol>
        <p className="text-[11px] leading-5 text-zinc-500">
          확장 프로그램은 이 프로그램과 같은 버전으로 함께 업데이트됩니다. 크롬 보안 정책상 웹사이트가 확장을 자동 설치하거나 설치 여부를 직접 확인할 수는 없어서,
          완료 표시는 이 브라우저에만 기록됩니다. 확장 프로그램 화면에도 새 버전 알림이 뜹니다.
        </p>
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

      <div className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <p className="text-xs font-bold text-zinc-800">3. 확장 프로그램 설정과 사용법</p>
        <ol className="list-decimal space-y-1.5 pl-5 text-xs leading-5 text-zinc-600">
          <li>
            <strong className="text-zinc-800">내 네이버 블로그 ID 저장</strong>: 확장 프로그램 사이드패널의 &quot;내 네이버 블로그&quot;에 블로그 주소의 아이디(예: blog.naver.com/<b>내아이디</b>)를 입력하고 저장합니다.
            저장한 블로그의 글쓰기 화면에만 입력하며, 다른 계정으로 로그인되어 있으면 입력하지 않고 멈춥니다. <strong className="text-zinc-800">이 설정을 저장하기 전에는 자동 입력이 시작되지 않습니다.</strong>
          </li>
          <li>
            <strong className="text-zinc-800">자동 시작</strong>: 글 보기 화면에서 &quot;네이버 입력기로 보내기&quot;를 누르면 확장이 보낸 뒤 <strong className="text-zinc-800">30분 안에</strong> 자동으로 입력을 시작합니다(크롬이 켜져 있고 확장이 연결되어 있어야 합니다).
            30분이 지난 글이나 실패한 글은 사이드패널의 &quot;보낸 글&quot;에서 글을 골라 &quot;직접 입력 시작&quot;을 누르세요. 이미 작성 중인 글이 있는 글쓰기 탭은 건드리지 않고 새 탭을 열어 입력합니다.
          </li>
          <li>
            <strong className="text-zinc-800">카테고리·태그</strong>: 사이드패널의 &quot;카테고리·태그 설정&quot;에 저장해 두면 본문 입력 뒤 발행 설정창에 자동으로 넣습니다. 태그를 비워 두면 글 끝의 해시태그를 씁니다.
          </li>
          <li>
            <strong className="text-zinc-800">완료 알림</strong>: 입력이 끝나면 크롬 알림(발행 직전 준비 완료 · 입력 완료 · 입력 중단)이 뜨고, 알림을 누르면 해당 네이버 탭으로 이동합니다. 사이드패널의 &quot;입력이 끝나면 크롬 알림 받기&quot;로 끌 수 있습니다(기본 켜짐).
          </li>
          <li>
            <strong className="text-zinc-800">이미지 &quot;AI 활용&quot; 표시</strong>: 사이드패널의 &quot;이미지에 AI 활용 표시 자동 켜기&quot;를 체크하면 입력한 이미지에 네이버의 AI 활용 표시를 자동으로 켭니다(기본 꺼짐).
          </li>
        </ol>
        <p className="text-[11px] leading-5 text-zinc-500">
          입력 중에는 네이버 탭을 닫거나 글쓰기 화면을 직접 만지지 마세요. 사이드패널을 닫아도 작업은 계속되며, 글 길이에 따라 5~10분 정도 걸립니다.
          입력 중 문제가 생기면 사이드패널의 &quot;진행 상태&quot;에 이유가 표시되고, 네이버 편집기에 입력된 내용은 지워지지 않고 그대로 남습니다.
        </p>
      </div>
    </section>
  )
}
