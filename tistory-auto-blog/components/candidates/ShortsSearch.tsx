'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

// 게시글 주제 수집의 "유튜브 쇼츠 떡상 분석"(v1.66). `app/(dashboard)/threads-content-ops/ShortsSearch.tsx`(쓰레드 자동화)와
// 네이버 블로그 에이전트 /collector의 같은 기능을 이 프로그램(블로그 글 주제 수집)에 맞게 옮겼다.
// 검색 결과는 저장하지 않고, "주제로 저장"을 누른 영상만 AI가 분석해 게시글 주제 후보로 저장한다. 사용량은 회원 본인의 키에서 차감된다.

type Video = {
  id: string
  title: string
  channelName: string
  thumbnail: string
  publishedAt: string
  durationSec: number
  views: number
  subs: number | null
  vsRatio: number | null
  viewsPerDay: number
  outlier: number
  viralScore: number
  grade: string
}

type KeyState = { hasYoutubeKey: boolean; hasGeminiKey: boolean; hasOpenaiKey: boolean }

const GRADE_TONE: Record<string, string> = {
  초대박: 'bg-rose-600 text-white',
  대박: 'bg-orange-500 text-white',
  떡상: 'bg-amber-300 text-amber-950',
  양호: 'bg-emerald-100 text-emerald-800',
  보통: 'bg-slate-100 text-slate-600',
  판정불가: 'bg-slate-100 text-slate-400',
}

const inputStyle = { color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' } as const
const inputClass = 'w-full p-2.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black placeholder-slate-400 shadow-sm'

const isoDay = (offsetDays: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString().split('T')[0]
}

function formatNumber(value: number | null): string {
  if (value === null) return '비공개'
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)}억`
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}만`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}천`
  return value.toLocaleString('ko-KR')
}

const formatDuration = (totalSeconds: number) => `${Math.floor(totalSeconds / 60)}:${String(Math.round(totalSeconds % 60)).padStart(2, '0')}`

export default function ShortsSearch({ categoryId, savedSources, onSaved, settingsHref }: { categoryId: string; savedSources: string[]; onSaved: () => void; settingsHref: string }) {
  const [keys, setKeys] = useState<KeyState | null>(null)
  const [query, setQuery] = useState('')
  const [dateFrom, setDateFrom] = useState(() => isoDay(-30))
  const [dateTo, setDateTo] = useState(() => isoDay(0))
  const [order, setOrder] = useState('viewCount')
  const [maxDuration, setMaxDuration] = useState('180')
  const [minViews, setMinViews] = useState('')
  const [maxSubs, setMaxSubs] = useState('')
  const [videos, setVideos] = useState<Video[]>([])
  const [searching, setSearching] = useState(false)
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [savedNow, setSavedNow] = useState<string[]>([])
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/candidates/shorts', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { if (data) setKeys({ hasYoutubeKey: Boolean(data.hasYoutubeKey), hasGeminiKey: Boolean(data.hasGeminiKey), hasOpenaiKey: Boolean(data.hasOpenaiKey) }) })
      .catch(() => {})
  }, [])

  const hasYoutubeKey = keys?.hasYoutubeKey ?? true // 확인 전에는 막지 않는다(서버가 최종 판단)
  const canAnalyze = keys ? keys.hasGeminiKey || keys.hasOpenaiKey : true
  const saved = useMemo(() => new Set([...savedSources, ...savedNow.map((id) => `https://www.youtube.com/shorts/${id}`)]), [savedSources, savedNow])

  // 길이·조회수·구독자 필터는 이미 가져온 결과에 바로 적용되어 추가 할당량을 쓰지 않는다.
  const filtered = useMemo(() => {
    const maxSeconds = maxDuration === 'all' ? null : Number(maxDuration)
    const viewsFloor = minViews ? Number(minViews) : null
    const subsCeiling = maxSubs ? Number(maxSubs) : null
    return videos
      .filter((video) => {
        if (maxSeconds !== null && video.durationSec > maxSeconds) return false
        if (viewsFloor !== null && video.views < viewsFloor) return false
        if (subsCeiling !== null && (video.subs === null || video.subs > subsCeiling)) return false
        return true
      })
      .sort((a, b) => b.viralScore - a.viralScore)
  }, [videos, maxDuration, minViews, maxSubs])

  const preset = (kind: 'viral' | 'small' | 'trending') => {
    setMaxDuration('180')
    if (kind === 'viral') { setDateFrom(isoDay(-7)); setMinViews('50000'); setMaxSubs('') }
    if (kind === 'small') { setDateFrom(isoDay(-30)); setMinViews('10000'); setMaxSubs('50000') }
    if (kind === 'trending') { setDateFrom(isoDay(-1)); setMinViews('5000'); setMaxSubs('') }
    setDateTo(isoDay(0))
  }

  const search = async () => {
    if (searching || !query.trim()) return
    setSearching(true)
    setMessage(null)
    try {
      const res = await fetch('/api/candidates/shorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'search', query, dateFrom, dateTo, order }) })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setVideos(data.videos as Video[])
        if (!data.videos.length) setMessage({ ok: false, text: '검색 결과가 없습니다. 검색어나 기간을 바꿔 보세요.' })
      } else setMessage({ ok: false, text: data.error || '검색에 실패했습니다.' })
    } catch {
      setMessage({ ok: false, text: '검색 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' })
    } finally {
      setSearching(false)
    }
  }

  const analyze = async (video: Video) => {
    if (analyzingId) return
    setAnalyzingId(video.id)
    setMessage(null)
    try {
      const res = await fetch('/api/candidates/shorts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', categoryId: categoryId || null, video: { id: video.id, title: video.title, channelName: video.channelName, views: video.views, subs: video.subs, vsRatio: video.vsRatio, grade: video.grade, publishedAt: video.publishedAt } }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.success) {
        setSavedNow((current) => [...current, video.id])
        setMessage({ ok: true, text: `게시글 주제 ${data.count}건을 분석해서 저장했습니다(${data.evidence === 'video' ? '영상 직접 분석' : '제목·수치·댓글 기반 추정'}). 아래 '수집된 블로그 주제' 목록에서 "이 주제로 글쓰기"를 누르면 됩니다.${data.note ? ` ${data.note}` : ''}` })
        onSaved()
      } else {
        if (res.status === 409) setSavedNow((current) => [...current, video.id])
        setMessage({ ok: false, text: data.error || '분석에 실패했습니다.' })
      }
    } catch {
      setMessage({ ok: false, text: '분석 요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.' })
    } finally {
      setAnalyzingId(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-slate-600">
        키워드로 쇼츠를 찾고, 구독자 대비 조회수가 크게 터진 영상을 골라 <b>게시글 주제</b>로 저장합니다. 영상의 대사·자막을 그대로 가져오지 않고, AI가 분석한 훅·터진 이유와 새로 쓴 주제 후보만 저장합니다.
      </p>
      <p className="text-xs leading-relaxed text-slate-500">
        결과의 <b>주제로 저장</b>을 누르면 AI가 영상이 터진 이유를 분석해 블로그 주제 후보 최대 3건을 만들어 저장합니다.{' '}
        {keys?.hasGeminiKey ? 'Gemini 키가 있어 영상을 직접 보고 분석합니다.' : keys?.hasOpenaiKey ? 'Gemini 키가 없어 OpenAI로 제목·수치·댓글을 근거로 추정 분석합니다(영상 직접 분석은 Gemini 키 등록).' : keys ? '분석에는 Gemini 또는 OpenAI 키가 필요합니다.' : ''}{' '}
        사용량은 회원님의 키에서 차감됩니다.
      </p>
      {keys && !hasYoutubeKey && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          YouTube Data API 키가 등록되지 않았습니다. <Link className="font-semibold underline" href={settingsHref}>API키등록·플랫폼연동</Link>에서 본인 키를 저장해 주세요.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input style={inputStyle} className={inputClass} maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search() }} placeholder="검색어 (예: 다이어트, 재테크, 여행, 자취)" aria-label="쇼츠 검색어" />
        <button type="button" disabled={searching || !hasYoutubeKey || !query.trim()} onClick={() => void search()} className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">
          {searching ? '검색 중…' : '🔍 쇼츠 검색'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-xs font-bold text-slate-500">프리셋</span>
        <button type="button" onClick={() => preset('viral')} className="font-semibold text-rose-600 hover:underline">🔥 지금 떡상</button>
        <span className="text-slate-300">|</span>
        <button type="button" onClick={() => preset('small')} className="font-semibold text-rose-600 hover:underline">🚀 작은 채널 대박</button>
        <span className="text-slate-300">|</span>
        <button type="button" onClick={() => preset('trending')} className="font-semibold text-rose-600 hover:underline">⚡ 급상승</button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-semibold text-slate-500 lg:col-span-2">게시 기간
          <div className="mt-1 flex items-center gap-1.5">
            <input type="date" style={inputStyle} className={inputClass} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span>~</span>
            <input type="date" style={inputStyle} className={inputClass} value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </label>
        <label className="text-xs font-semibold text-slate-500">검색 정렬
          <select style={inputStyle} className={`${inputClass} mt-1`} value={order} onChange={(e) => setOrder(e.target.value)}>
            <option value="viewCount">조회수 높은 순</option><option value="relevance">관련도 순</option><option value="date">최신 순</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-slate-500">영상 길이
          <select style={inputStyle} className={`${inputClass} mt-1`} value={maxDuration} onChange={(e) => setMaxDuration(e.target.value)}>
            <option value="60">1분 이내</option><option value="180">3분 이내</option><option value="all">전체</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold text-slate-500">최소 조회수<input type="number" min={0} style={inputStyle} className={`${inputClass} mt-1`} value={minViews} onChange={(e) => setMinViews(e.target.value)} placeholder="10000" /></label>
          <label className="text-xs font-semibold text-slate-500">최대 구독자<input type="number" min={0} style={inputStyle} className={`${inputClass} mt-1`} value={maxSubs} onChange={(e) => setMaxSubs(e.target.value)} placeholder="50000" /></label>
        </div>
      </div>
      <p className="text-xs text-slate-500">검색 1회는 회원님의 YouTube 할당량 약 100유닛을 사용합니다(기본 하루 1만유닛 ≈ 100회). 길이·조회수·구독자 필터는 이미 가져온 결과에 바로 적용되며 추가 할당량을 쓰지 않습니다.</p>

      {message && (
        <p role="status" className={`rounded-xl border p-3 text-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{message.text}</p>
      )}

      {videos.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-slate-900">검색 결과 <span className="text-xs font-normal text-slate-500">({filtered.length}개 / 전체 {videos.length}개)</span></p>
          {!filtered.length ? (
            <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">조건에 맞는 영상이 없습니다. 필터를 조정해 보세요.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {filtered.map((video) => {
                const isSaved = saved.has(`https://www.youtube.com/shorts/${video.id}`)
                return (
                  <li key={video.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
                    <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noopener noreferrer" className="relative block h-[68px] w-[120px] shrink-0" aria-label="유튜브에서 영상 보기">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {video.thumbnail ? <img src={video.thumbnail} alt="" className="h-full w-full rounded-lg object-cover" /> : <span className="block h-full w-full rounded-lg bg-slate-100" />}
                      <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[10px] text-white">{formatDuration(video.durationSec)}</span>
                    </a>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${GRADE_TONE[video.grade] ?? GRADE_TONE.보통}`}>{video.grade}</span><span className="text-xs text-slate-500">점수 {video.viralScore}</span></div>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900" title={video.title}>{video.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{video.channelName} · {new Date(video.publishedAt).toLocaleDateString('ko-KR')}</p>
                      <p className="mt-1 text-xs text-slate-600">조회수 <b>{formatNumber(video.views)}</b> · 구독자 {formatNumber(video.subs)} · 조회÷구독 {video.vsRatio === null ? '-' : `${video.vsRatio.toFixed(1)}배`} · 채널평균 대비 {video.outlier.toFixed(1)}배 · 하루 {formatNumber(Math.round(video.viewsPerDay))}회</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <a href={`https://www.youtube.com/shorts/${video.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">영상 보기</a>
                      <button type="button" disabled={isSaved || !canAnalyze || analyzingId !== null} onClick={() => void analyze(video)} title={canAnalyze ? 'AI가 영상이 터진 이유를 분석해 블로그 주제로 저장합니다' : 'Gemini 또는 OpenAI 키가 필요합니다'} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border-2 border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50">
                        {isSaved ? '저장됨' : analyzingId === video.id ? '분석·저장 중… (최대 2분)' : '주제로 저장'}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-slate-500">등급 기준(조회수÷구독자): 초대박 10배↑ · 대박 5배↑ · 떡상 3배↑ · 양호 1배↑. 구독자 비공개 채널은 판정불가입니다. 점수는 채널평균 대비·구독자 대비·조회 속도·참여율·최신성을 합산한 참고 지표입니다.</p>
        </div>
      )}
    </div>
  )
}
