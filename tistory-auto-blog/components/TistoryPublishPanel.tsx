'use client'

import { useEffect, useRef, useState } from 'react'
import { DEFAULT_TISTORY_PUBLISH, TISTORY_HOME_TOPICS, type TistoryPublish } from '@/blog/utils/tistoryPublish'

// "티스토리 입력기로 보내기" 옆의 발행 설정(v1.58): 카테고리·공개 범위·댓글·홈주제·발행 시점을 글마다 정해 글과 함께 확장으로 보낸다.
// 카테고리 목록은 티스토리 크롬 확장이 읽어 준다(v1.59 이상, 새 탭에서 읽고 닫음). 확장이 없거나 옛 버전이면 이름을 직접 입력한다.
// 보호글(비밀번호)은 비밀번호를 저장하지 않기 위해 자동 입력에서 지원하지 않는다 — 필요하면 티스토리에서 직접 보호로 바꾼다.
// 마지막으로 보낸 글의 설정이 다음 글의 기본값이 된다(예약 발행은 이어받지 않음).

const APP = 'tistory-publishing-app'
const EXTENSION = 'tistory-publishing-extension'

function askExtension<T>(type: 'ping' | 'categories', timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`
    const timer = window.setTimeout(() => { window.removeEventListener('message', onMessage); resolve(null) }, timeoutMs)
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return
      const data = event.data
      if (data?.source !== EXTENSION || data.requestId !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(data.result as T)
    }
    window.addEventListener('message', onMessage)
    window.postMessage({ source: APP, type, requestId }, window.location.origin)
  })
}

const field = 'w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 disabled:opacity-60'
const label = 'text-[11px] font-semibold text-slate-600'

export default function TistoryPublishPanel({ value, onChange, disabled }: { value: TistoryPublish; onChange: (next: TistoryPublish) => void; disabled?: boolean }) {
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const defaultLoaded = useRef(false)

  // 마지막으로 보낸 글의 발행 설정을 기본값으로(한 번만)
  useEffect(() => {
    if (defaultLoaded.current) return
    defaultLoaded.current = true
    fetch('/api/posts/tistory-publish-default', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.publish) onChange({ ...DEFAULT_TISTORY_PUBLISH, ...(data.publish as TistoryPublish) }) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (patch: Partial<TistoryPublish>) => onChange({ ...value, ...patch })

  const loadCategories = async () => {
    setLoading(true)
    setMessage('')
    try {
      const ping = await askExtension<{ ok?: boolean; version?: string }>('ping', 1500)
      if (!ping?.ok) {
        setMessage('티스토리 확장 프로그램(v1.59 이상)을 찾지 못했습니다. 설정 화면에서 최신 ZIP을 받아 덮어쓰고 chrome://extensions에서 새로고침한 뒤 이 화면도 새로고침해 주세요. 그 전에는 카테고리 이름을 직접 입력하세요.')
        return
      }
      setMessage('티스토리에서 내 카테고리를 읽는 중입니다. 티스토리 창이 잠깐 열렸다 닫힙니다(로그인이 필요하면 로그인해 주세요).')
      const result = await askExtension<{ categories?: string[]; error?: string }>('categories', 150000)
      if (!result) { setMessage('확장 프로그램이 응답하지 않았습니다. 확장을 새로고침하고 다시 시도해 주세요.'); return }
      if (result.error || !Array.isArray(result.categories)) { setMessage(result.error || '카테고리를 읽지 못했습니다.'); return }
      setCategories(result.categories)
      setMessage(`내 티스토리 카테고리 ${result.categories.length}개를 불러왔습니다.`)
      if (value.category && !result.categories.includes(value.category)) {
        set({ category: '' })
        setMessage('선택했던 카테고리가 티스토리에 없어 선택을 해제했습니다. 목록에서 다시 골라 주세요.')
      }
    } finally {
      setLoading(false)
    }
  }

  const categoryOptions = value.category && !categories.includes(value.category) ? [value.category, ...categories] : categories
  const busy = disabled || loading

  return (
    <details className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <summary className="cursor-pointer select-none text-xs font-bold text-slate-700">
        발행 설정 — {value.category || '카테고리 없음'} · {value.visibility === 'private' ? '비공개' : '공개'} · {value.timing === 'reserve' ? `예약 ${value.reserveDate} ${value.reserveTime}` : '현재 발행'}
      </summary>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-4">
          <span className={label}>카테고리</span>
          <div className="flex flex-wrap items-center gap-1.5">
            {categoryOptions.length > 0 ? (
              <select disabled={busy} value={value.category} onChange={(event) => set({ category: event.target.value })} className={`${field} sm:max-w-[320px]`} aria-label="티스토리 카테고리">
                <option value="">지정 안 함 (티스토리 기본 카테고리)</option>
                {categoryOptions.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
            ) : (
              <input disabled={busy} value={value.category} onChange={(event) => set({ category: event.target.value })} maxLength={120} placeholder="카테고리 전체 이름(비우면 지정 안 함)" className={`${field} sm:max-w-[320px]`} aria-label="티스토리 카테고리 이름" />
            )}
            <button type="button" disabled={busy} onClick={loadCategories} className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">
              {loading ? '⏳ 불러오는 중...' : '카테고리 불러오기'}
            </button>
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className={label}>공개 범위</span>
          <select disabled={busy} value={value.visibility} onChange={(event) => set({ visibility: event.target.value as TistoryPublish['visibility'] })} className={field}>
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>댓글</span>
          <select disabled={busy} value={value.comment} onChange={(event) => set({ comment: event.target.value as TistoryPublish['comment'] })} className={field}>
            <option value="allow">허용</option>
            <option value="deny">비허용</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>홈주제</span>
          <select disabled={busy} value={value.topic} onChange={(event) => set({ topic: event.target.value })} className={field}>
            <option value="">선택 안 함</option>
            {TISTORY_HOME_TOPICS.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={label}>발행 시점</span>
          <select disabled={busy} value={value.timing} onChange={(event) => set({ timing: event.target.value as TistoryPublish['timing'] })} className={field}>
            <option value="now">현재</option>
            <option value="reserve">예약</option>
          </select>
        </label>
        {value.timing === 'reserve' && (
          <div className="flex flex-wrap items-center gap-1.5 sm:col-span-2 lg:col-span-4">
            <input disabled={busy} type="date" value={value.reserveDate} onChange={(event) => set({ reserveDate: event.target.value })} className={`${field} !w-auto`} aria-label="예약 날짜" />
            <input disabled={busy} type="time" step={60} value={value.reserveTime} onChange={(event) => set({ reserveTime: event.target.value })} className={`${field} !w-auto`} aria-label="예약 시간" />
            <span className="text-[11px] text-slate-500">한국 시간 기준, 지금보다 뒤여야 합니다.</span>
          </div>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-4 text-slate-500">
        보호글(비밀번호)은 자동 입력에서 지원하지 않습니다. 필요하면 티스토리에서 직접 보호로 바꿔 주세요. 마지막 저장·발행 버튼도 직접 누릅니다.
      </p>
      {message && <p className="mt-1 text-[11px] leading-4 text-slate-600">{message}</p>}
    </details>
  )
}
