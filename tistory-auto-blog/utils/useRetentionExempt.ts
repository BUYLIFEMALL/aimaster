'use client'

import { useEffect, useState } from 'react'

// 30일 보관 열외 회원인지(관리자·시험 계정) 한 번만 묻고 화면 여러 곳이 같은 답을 쓴다(2026-11-12).
// 모르는 동안과 실패하면 false — 일반 회원처럼 30일 안내를 보인다(안내만 바뀌고 삭제 판정은 서버가 한다).
let cached: Promise<boolean> | null = null

function loadExempt(): Promise<boolean> {
  cached ??= fetch('/api/retention-status', { cache: 'no-store' })
    .then((res) => (res.ok ? res.json() : { exempt: false }))
    .then((body: { exempt?: unknown }) => body?.exempt === true)
    .catch(() => {
      cached = null
      return false
    })
  return cached
}

export function useRetentionExempt(): boolean {
  const [exempt, setExempt] = useState(false)
  useEffect(() => {
    let alive = true
    loadExempt().then((value) => {
      if (alive) setExempt(value)
    })
    return () => {
      alive = false
    }
  }, [])
  return exempt
}
