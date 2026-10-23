'use client'
import { useState } from 'react'
import type { TistoryPublish } from '@/blog/utils/tistoryPublish'

function read(value: unknown): Record<string, unknown> | null {
  const item = value && typeof value === 'object' ? (value as Record<string, unknown>).automation : null
  return item && typeof item === 'object' && (item as Record<string, unknown>).mode === 'auto' ? item as Record<string, unknown> : null
}
export default function AutoPublishPanel({ postId, publish, initial, onQueued }: { postId: number; publish: TistoryPublish; initial: unknown; onQueued: () => void }) {
  const [record, setRecord] = useState(read(initial)), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const labels: Record<string, string> = { queued: '자동 포스팅 대기/입력 중', publishing: '발행 결과 확인 중', published: '실제 발행 완료', uncertain: '발행 결과 불확실 · 재발행 금지', failed: '자동 포스팅 중단 · 원고 확인 필요' }
  const url = typeof record?.url === 'string' && /^https:\/\/[a-z0-9-]+\.tistory\.com\/(?:[1-9]\d*|entry\/[^/?#]+)$/.test(record.url) ? record.url : null
  async function refresh() {
    setBusy(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, { cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '기록을 읽지 못했습니다.')
      setRecord(read(result.data?.tistory_publish)); setMessage('서버에 저장된 발행 결과를 다시 확인했습니다.')
    } catch (e) { setMessage(e instanceof Error ? e.message : '기록 확인에 실패했습니다.') } finally { setBusy(false) }
  }
  async function start() {
    setBusy(true); setMessage('자동 포스팅 원고를 전송하는 중...')
    try {
      const response = await fetch(`/api/posts/${postId}/extension-handoff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ publish, mode: 'auto' }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '자동 포스팅 전송에 실패했습니다.')
      setRecord({ mode: 'auto', state: 'queued' }); onQueued(); setMessage('확장이 새 글쓰기 탭에서 입력·최종 발행·실제 게시 URL 기록까지 진행합니다. 진행 중에는 편집기를 조작하지 마세요.')
    } catch (e) { setMessage(e instanceof Error ? e.message : '전송에 실패했습니다.') } finally { setBusy(false) }
  }
  async function duplicate() {
    setBusy(true)
    try {
      const response = await fetch(`/api/posts/${postId}/duplicate`, { method: 'POST' }); const result = await response.json()
      if (!response.ok) throw new Error(result.error || '원고 복제 실패')
      window.location.href = `/posts/${result.id}`
    } catch (e) { setMessage(e instanceof Error ? e.message : '복제에 실패했습니다.'); setBusy(false) }
  }
  return <section className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4" aria-label="자동 포스팅과 실제 발행 기록">
    <h2 className="font-bold text-slate-900">🚀 자동 포스팅 · 실제 발행 기록</h2>
    <p className="my-2 text-sm">원고와 위 발행 설정을 확인한 뒤 시작하세요. 선택한 블로그에 실제로 발행합니다. 자동 포스팅은 현재 발행을 지원하며, 예약은 입력 준비로 보낼 수 있습니다.</p>
    {!record && <button type="button" disabled={busy || publish.timing !== 'now'} onClick={() => void start()} className="rounded-lg bg-orange-600 px-4 py-2 font-bold text-white disabled:opacity-50">🚀 {publish.visibility === 'private' ? '비공개' : '공개'} 자동 포스팅 시작</button>}
    {record && <><strong role="status">{labels[String(record.state)] || '발행 기록 확인 필요'}</strong>{record.state === 'published' && url && <p><a className="underline" href={url} target="_blank" rel="noreferrer">실제 발행된 글 열기 ↗</a></p>}{typeof record.publishedAt === 'string' && <p>{new Date(record.publishedAt).toLocaleString('ko-KR')}</p>}{typeof record.error === 'string' && <p>{record.error}</p>}<p className="my-2 text-sm">실행 원고는 수정·삭제·재전송하지 않습니다. 결과가 불확실하면 확장의 ‘마지막 발행 결과만 다시 확인’을 실행하세요. 새 작업은 원고를 복제해 시작합니다.</p><button type="button" disabled={busy} onClick={() => void duplicate()} className="mr-3 rounded border border-orange-300 bg-white px-3 py-2">새 원고로 복제</button></>}
    <button type="button" disabled={busy} onClick={() => void refresh()} className="ml-3 rounded border border-orange-300 bg-white px-3 py-2">발행 기록 새로고침</button>
    <p role="status" className="mt-2 text-sm">{message}</p>
  </section>
}
