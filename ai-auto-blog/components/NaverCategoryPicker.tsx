'use client'

import { useEffect, useRef, useState } from 'react'
import type { NaverCategory } from '@/blog/utils/naverCategory'

// "네이버 입력기로 보내기" 옆의 네이버 카테고리 선택(v1.57).
// 회원의 실제 네이버 카테고리 목록은 BLOG 크롬 확장이 읽어 준다(확장이 새 탭에서 발행 설정창만 열어 읽고 닫음).
// 고른 카테고리는 글과 함께 확장으로 보내지고, 마지막으로 보낸 글의 선택이 다음 글의 기본값이 된다.

const APP = 'blog-publishing-app'
const EXTENSION = 'blog-publishing-extension'

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

export default function NaverCategoryPicker({ value, onChange, disabled }: { value: NaverCategory | null; onChange: (category: NaverCategory | null) => void; disabled?: boolean }) {
  const [list, setList] = useState<NaverCategory[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const defaultLoaded = useRef(false)

  // 마지막으로 보낸 글에서 고른 카테고리를 기본값으로(한 번만, 아직 고르지 않았을 때만)
  useEffect(() => {
    if (defaultLoaded.current) return
    defaultLoaded.current = true
    fetch('/api/posts/naver-category-default', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data?.category && !value) onChange(data.category as NaverCategory) })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCategories = async () => {
    setLoading(true)
    setMessage('')
    try {
      const ping = await askExtension<{ ok?: boolean; version?: string }>('ping', 1500)
      if (!ping?.ok) {
        setMessage('BLOG 확장 프로그램(v1.57 이상)을 찾지 못했습니다. 설정 화면에서 최신 ZIP을 받아 덮어쓰고 chrome://extensions에서 새로고침한 뒤 이 화면도 새로고침해 주세요.')
        return
      }
      setMessage('네이버에서 내 카테고리를 읽는 중입니다. 네이버 창이 잠깐 열렸다 닫힙니다(로그인이 필요하면 로그인해 주세요).')
      const result = await askExtension<{ categories?: NaverCategory[]; error?: string }>('categories', 150000)
      if (!result) { setMessage('확장 프로그램이 응답하지 않았습니다. 확장을 새로고침하고 다시 시도해 주세요.'); return }
      if (result.error || !Array.isArray(result.categories)) { setMessage(result.error || '카테고리를 읽지 못했습니다.'); return }
      setList(result.categories)
      setMessage(`내 네이버 카테고리 ${result.categories.length}개를 불러왔습니다.`)
      // 불러온 목록에 같은 번호가 있으면 이름 변경을 반영하고, 없으면(삭제됨) 선택을 해제한다.
      if (value) {
        const same = result.categories.find((item) => item.id === value.id)
        if (!same) { onChange(null); setMessage('선택했던 카테고리가 네이버에 없어 선택을 해제했습니다. 목록에서 다시 골라 주세요.') }
        else if (same.name !== value.name) onChange(same)
      }
    } finally {
      setLoading(false)
    }
  }

  const options = value && !list.some((item) => item.id === value.id) ? [value, ...list] : list

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <label className="text-xs font-semibold text-slate-600" htmlFor="naver-category-select">네이버 카테고리</label>
        <select
          id="naver-category-select"
          disabled={disabled || loading}
          value={value?.id ?? ''}
          onChange={(event) => onChange(options.find((item) => item.id === event.target.value) ?? null)}
          className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700"
        >
          <option value="">지정 안 함 (네이버 기본 카테고리)</option>
          {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button
          type="button"
          disabled={disabled || loading}
          onClick={loadCategories}
          className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60 cursor-pointer"
        >
          {loading ? '⏳ 불러오는 중...' : '카테고리 불러오기'}
        </button>
      </div>
      {message && <p className="text-[11px] leading-4 text-slate-500">{message}</p>}
    </div>
  )
}
