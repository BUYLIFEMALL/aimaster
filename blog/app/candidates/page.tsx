'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath, getBlogAuthPath } from '@/blog/utils/basePath'
import CategoryManagementModal from '@/blog/app/_components/CategoryManagementModal'

interface Candidate {
  id: string
  source_type: 'http' | 'rss' | 'perplexity'
  source_input: string
  title: string
  summary: string
  keywords: string[]
  category_id: number | null
  created_at: string
}

interface CategoryOption {
  id: number
  name: string
  slug: string
}

interface NewsblurFeed {
  id: string
  title: string
  link: string
}

type Method = 'http' | 'rss' | 'perplexity'

const METHOD_LABELS: Record<Method, string> = {
  http: 'HTTP (URL 지정)',
  rss: 'RSS (NewsBlur 구독 피드)',
  perplexity: 'Perplexity (트렌드 검색)',
}

const SOURCE_LABELS: Record<Method, string> = {
  http: 'HTTP',
  rss: 'RSS',
  perplexity: 'Perplexity',
}

export default function CandidatesPage() {
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSupabase(createClient())
      setBasePath(getBlogBasePath())
    }
  }, [])

  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  // 체크박스로 선택한 후보를 한꺼번에(또는 1건만 골라 개별로) 다른 카테고리로 옮기는 상태
  // (naver-cafe-poster/candidates와 동일한 방식, 2026-09-16 요청: "개별 셀렉트 방식보단
  // 좌측 체크박스 형태로 일괄 및 개별로 카테고리 분류할수 있도록").
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [moveCategoryId, setMoveCategoryId] = useState('')
  const [isMoving, setIsMoving] = useState(false)
  const [moveMsg, setMoveMsg] = useState<string | null>(null)

  const [method, setMethod] = useState<Method>('http')
  const [collecting, setCollecting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [collectCategoryId, setCollectCategoryId] = useState('')

  const [httpUrl, setHttpUrl] = useState('')
  const [perplexityTopic, setPerplexityTopic] = useState('')

  const [newsblurConnected, setNewsblurConnected] = useState(false)
  const [newsblurUsername, setNewsblurUsername] = useState<string | null>(null)
  const [newsblurFeeds, setNewsblurFeeds] = useState<NewsblurFeed[]>([])
  const [newsblurLoadError, setNewsblurLoadError] = useState<string | null>(null)
  const [selectedFeedId, setSelectedFeedId] = useState('')
  const [nbUsernameInput, setNbUsernameInput] = useState('')
  const [nbPasswordInput, setNbPasswordInput] = useState('')
  const [nbSaving, setNbSaving] = useState(false)

  const loadCandidates = async (sb: any, userId: string) => {
    const { data } = await sb
      .from('blog_candidates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setCandidates(data ?? [])
  }

  const loadCategories = async (sb: any) => {
    const { data } = await sb.from('blog_categories').select('id, name, slug').order('id', { ascending: true })
    setCategories(data ?? [])
  }

  const loadNewsblurFeeds = async () => {
    try {
      const res = await fetch('/api/newsblur-account/feeds')
      const data = await res.json()
      setNewsblurConnected(!!data.connected)
      setNewsblurUsername(data.username ?? null)
      setNewsblurFeeds(data.feeds ?? [])
      setNewsblurLoadError(data.error ?? null)
      if (data.feeds?.length > 0) setSelectedFeedId(data.feeds[0].id)
    } catch {
      setNewsblurLoadError('NewsBlur 연결 상태를 확인하지 못했습니다.')
    }
  }

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(async ({ data }: any) => {
      const user = data?.user
      if (!user) {
        router.push(`${getBlogAuthPath()}?redirect=${getBlogBasePath()}/candidates`)
        return
      }
      setUserEmail(user.email ?? null)
      await Promise.all([loadCandidates(supabase, user.id), loadCategories(supabase), loadNewsblurFeeds()])
      setLoading(false)
    })
  }, [supabase, router])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleMoveSelected = async () => {
    if (selectedIds.size === 0 || !supabase) return
    setIsMoving(true)
    setMoveMsg(null)
    const categoryId = moveCategoryId === '' ? null : Number(moveCategoryId)
    const ids = Array.from(selectedIds)
    const { error } = await supabase.from('blog_candidates').update({ category_id: categoryId }).in('id', ids)
    if (error) {
      setMoveMsg('이동 실패: ' + error.message)
    } else {
      setCandidates((prev) => prev.map((c) => (ids.includes(c.id) ? { ...c, category_id: categoryId } : c)))
      setSelectedIds(new Set())
      setMoveMsg(`${ids.length}건을 이동했습니다.`)
    }
    setIsMoving(false)
  }

  const handleCollect = async (endpoint: string, body: Record<string, unknown>) => {
    setCollecting(true)
    setResultMsg(null)
    setErrorMsg(null)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || '수집에 실패했습니다.')
      }
      setResultMsg(`블로그 주제 ${data.count}건을 수집했습니다.`)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) await loadCandidates(supabase, user.id)
    } catch (err: any) {
      setErrorMsg(err.message || '알 수 없는 오류가 발생했습니다.')
    } finally {
      setCollecting(false)
    }
  }

  const handleHttpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!httpUrl.trim()) return
    handleCollect('/api/candidates/http', { url: httpUrl.trim(), categoryId: collectCategoryId || undefined })
  }

  const handleRssSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFeedId) return
    const feed = newsblurFeeds.find((f) => f.id === selectedFeedId)
    handleCollect('/api/candidates/rss', {
      feedId: selectedFeedId,
      feedTitle: feed?.title ?? '',
      categoryId: collectCategoryId || undefined,
    })
  }

  const handlePerplexitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!perplexityTopic.trim()) return
    handleCollect('/api/candidates/perplexity', {
      topic: perplexityTopic.trim(),
      categoryId: collectCategoryId || undefined,
    })
  }

  const handleNewsblurConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setNbSaving(true)
    setNewsblurLoadError(null)
    try {
      const res = await fetch('/api/newsblur-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: nbUsernameInput.trim(), password: nbPasswordInput.trim() }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'NewsBlur 계정 연결에 실패했습니다.')
      }
      setNbUsernameInput('')
      setNbPasswordInput('')
      await loadNewsblurFeeds()
    } catch (err: any) {
      setNewsblurLoadError(err.message || 'NewsBlur 계정 연결에 실패했습니다.')
    } finally {
      setNbSaving(false)
    }
  }

  const handleNewsblurDisconnect = async () => {
    if (!confirm('NewsBlur 연결을 해제하시겠습니까?')) return
    await fetch('/api/newsblur-account', { method: 'DELETE' })
    setNewsblurConnected(false)
    setNewsblurUsername(null)
    setNewsblurFeeds([])
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '삭제에 실패했습니다.')
      setCandidates((prev) => prev.filter((c) => c.id !== id))
    } catch (err: any) {
      alert(err.message || '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const sourceCounts: Record<Method, number> = { http: 0, rss: 0, perplexity: 0 }
  for (const c of candidates) sourceCounts[c.source_type] += 1

  const filteredCandidates = candidates.filter((c) => {
    if (categoryFilter === 'all') return true
    if (categoryFilter === 'uncategorized') return c.category_id === null
    return c.category_id === Number(categoryFilter)
  })

  const categoryNameById = new Map(categories.map((cat) => [cat.id, cat.name]))

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={basePath || '/'} className="text-xl font-black text-indigo-600 no-underline">
            BLOG(원문)생성 자동화
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {userEmail ? <span>{userEmail}</span> : <Link href={getBlogAuthPath()}>로그인</Link>}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">게시글 주제 수집</h1>
          <Link href={`${basePath}/write/ai-form`} className="text-sm font-semibold text-blue-600 hover:underline">
            수집 없이 바로 글쓰기 →
          </Link>
        </div>
        <p className="text-sm font-medium text-slate-500 mb-6">
          HTTP(특정 URL), RSS(NewsBlur 구독 피드), Perplexity(트렌드 검색) 중 하나를 선택해서 블로그에 올릴
          주제와 SEO 키워드 후보를 수집합니다.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {(Object.keys(sourceCounts) as Method[]).map((type) => (
            <div key={type} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-2xl font-extrabold text-slate-900">{sourceCounts[type]}</div>
              <div className="mt-1 text-xs font-semibold text-slate-500">{SOURCE_LABELS[type]}로 수집</div>
            </div>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
          <h2 className="mb-3 text-sm font-bold text-slate-900">📋 글감 수집 · 카테고리 사용법</h2>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-600">
            <li>
              <strong>카테고리 관리</strong>에서 후보를 분류할 카테고리를 미리 만들어두면(블로그
              게시글 카테고리와 동일한 목록을 공유합니다), 아래에서 <strong>HTTP/RSS/Perplexity</strong>
              중 하나를 고르고 <strong>수집할 카테고리</strong>를 지정해 블로그 주제 후보를
              수집합니다.
            </li>
            <li>
              <strong>카테고리 필터</strong>로 원하는 카테고리의 후보만 모아볼 수 있습니다.
            </li>
            <li>
              이미 수집된 후보는 카드 왼쪽 체크박스로 1건만 선택하거나 여러 건을 한꺼번에 선택한
              뒤, <strong>카테고리 이동</strong> 드롭다운에서 옮길 카테고리를 고르고
              <strong>&quot;선택한 후보 이동&quot;</strong>을 누르면 개별/일괄 재분류됩니다.
            </li>
            <li>
              마음에 드는 후보를 찾으면 <strong>&quot;이 주제로 글쓰기&quot;</strong>를 눌러 AI
              글쓰기로 넘어갑니다.
            </li>
          </ol>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">🗂 카테고리 관리</h2>
            <button
              type="button"
              onClick={() => setShowCategoryModal(true)}
              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
            >
              ⚙️ 카테고리 추가·수정·삭제
            </button>
          </div>
          {categories.length === 0 ? (
            <p className="text-xs text-slate-500">
              등록된 카테고리가 없습니다. 위 버튼을 눌러 후보를 분류할 카테고리를 만들어보세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span key={cat.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {cat.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-8">
          <div className="mb-4 flex gap-2 border-b border-slate-100 pb-4">
            {(Object.keys(METHOD_LABELS) as Method[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMethod(m)
                  setResultMsg(null)
                  setErrorMsg(null)
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  method === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {METHOD_LABELS[m]}
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label className="mb-1 block text-xs font-bold text-slate-700">수집할 카테고리</label>
            <select
              value={collectCategoryId}
              onChange={(e) => setCollectCategoryId(e.target.value)}
              style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
              className="w-full p-2.5 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black shadow-sm"
            >
              <option value="">카테고리 없음</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {method === 'http' && (
            <form onSubmit={handleHttpSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">대상 페이지 URL</label>
                <input
                  type="url"
                  required
                  value={httpUrl}
                  onChange={(e) => setHttpUrl(e.target.value)}
                  placeholder="https://example.com/article/123"
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black placeholder-slate-400 shadow-sm"
                />
                <p className="mt-1 text-xs text-slate-500">
                  특정 게시글 URL이면 그 글로 1건, 카테고리/목록 페이지 URL이면 그 안의 게시글 중 무작위로
                  최대 5건을 골라 각각 블로그 주제를 생성합니다.
                </p>
              </div>
              <button
                type="submit"
                disabled={collecting}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
              >
                {collecting ? '수집 중...' : '이 페이지로 주제 생성'}
              </button>
            </form>
          )}

          {method === 'rss' &&
            (!newsblurConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">
                  NewsBlur(newsblur.com) 계정을 연결하면 구독 중인 피드 목록을 불러와서 고를 수 있습니다.
                </p>
                <form onSubmit={handleNewsblurConnect} className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">NewsBlur 아이디</label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      value={nbUsernameInput}
                      onChange={(e) => setNbUsernameInput(e.target.value)}
                      style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                      className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black shadow-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">NewsBlur 비밀번호</label>
                    <input
                      type="password"
                      required
                      autoComplete="off"
                      value={nbPasswordInput}
                      onChange={(e) => setNbPasswordInput(e.target.value)}
                      style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                      className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black shadow-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={nbSaving}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
                  >
                    {nbSaving ? '연결 확인 중...' : 'NewsBlur 계정 연결'}
                  </button>
                  {newsblurLoadError && <p className="text-sm text-red-600">{newsblurLoadError}</p>}
                </form>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <span className="text-slate-700">NewsBlur 연결됨: {newsblurUsername}</span>
                  <button type="button" onClick={handleNewsblurDisconnect} className="text-xs text-red-600 hover:underline">
                    연결 해제
                  </button>
                </div>

                {newsblurLoadError && <p className="text-sm text-red-600">{newsblurLoadError}</p>}

                {!newsblurLoadError && newsblurFeeds.length === 0 && (
                  <p className="text-sm text-slate-500">구독 중인 피드가 없습니다.</p>
                )}

                {newsblurFeeds.length > 0 && (
                  <form onSubmit={handleRssSubmit} className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">구독 피드 선택</label>
                      <select
                        value={selectedFeedId}
                        onChange={(e) => setSelectedFeedId(e.target.value)}
                        style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                        className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black shadow-sm"
                      >
                        {newsblurFeeds.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.title}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="submit"
                      disabled={collecting || !selectedFeedId}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
                    >
                      {collecting ? '수집 중...' : '이 피드로 주제 생성'}
                    </button>
                  </form>
                )}
              </div>
            ))}

          {method === 'perplexity' && (
            <form onSubmit={handlePerplexitySubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">시드 주제</label>
                <input
                  type="text"
                  required
                  value={perplexityTopic}
                  onChange={(e) => setPerplexityTopic(e.target.value)}
                  placeholder="예: 다이어트 보조제"
                  style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
                  className="w-full p-3 rounded-xl focus:outline-none focus:border-indigo-600 text-sm font-semibold text-black placeholder-slate-400 shadow-sm"
                />
              </div>
              <button
                type="submit"
                disabled={collecting}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition-all"
              >
                {collecting ? '검색 중...' : '현재 트렌딩 앵글로 주제 생성'}
              </button>
            </form>
          )}

          {resultMsg && <p className="mt-3 text-sm font-semibold text-green-600">{resultMsg}</p>}
          {errorMsg && <p className="mt-3 text-sm font-semibold text-red-600">{errorMsg}</p>}
        </div>

        <h2 className="mb-3 text-lg font-bold text-slate-900">수집된 블로그 주제</h2>

        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-500">카테고리 필터</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
              className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-black"
            >
              <option value="all">전체</option>
              <option value="uncategorized">카테고리 없음</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            <input
              type="checkbox"
              checked={filteredCandidates.length > 0 && filteredCandidates.every((c) => selectedIds.has(c.id))}
              onChange={() => {
                setSelectedIds((prev) => {
                  const allSelected = filteredCandidates.length > 0 && filteredCandidates.every((c) => prev.has(c.id))
                  const next = new Set(prev)
                  if (allSelected) {
                    filteredCandidates.forEach((c) => next.delete(c.id))
                  } else {
                    filteredCandidates.forEach((c) => next.add(c.id))
                  }
                  return next
                })
              }}
              className="h-4 w-4"
            />
            전체 선택
          </label>
          <span className="text-xs text-slate-500">{selectedIds.size}건 선택됨</span>

          <select
            value={moveCategoryId}
            onChange={(e) => setMoveCategoryId(e.target.value)}
            style={{ color: '#000000', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1' }}
            className="rounded-lg px-2.5 py-1.5 text-xs font-bold text-black"
          >
            <option value="">카테고리 없음</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleMoveSelected}
            disabled={selectedIds.size === 0 || isMoving}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
          >
            {isMoving ? '이동 중...' : '선택한 후보 이동'}
          </button>

          {moveMsg && (
            <span className={`text-xs font-semibold ${moveMsg.startsWith('이동 실패') ? 'text-red-600' : 'text-emerald-600'}`}>
              {moveMsg}
            </span>
          )}
        </div>
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            {candidates.length === 0
              ? '아직 수집된 블로그 주제가 없습니다. 위에서 방식을 선택해 첫 주제를 만들어보세요.'
              : '이 카테고리에 해당하는 후보가 없습니다.'}
          </div>
        ) : (
          <ul className="space-y-3">
            {filteredCandidates.map((c) => {
              const writeParams = new URLSearchParams({ topic: c.title })
              if (c.keywords && c.keywords.length > 0) writeParams.set('keywords', c.keywords.join(','))
              return (
                <li key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="mt-1 h-4 w-4 shrink-0"
                        aria-label="이동할 후보 선택"
                      />
                      <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`${basePath}/write/ai-form?${writeParams.toString()}`}
                        className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700"
                      >
                        이 주제로 글쓰기
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {deletingId === c.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>
                  {c.category_id !== null && (
                    <div className="mb-2 ml-6">
                      <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                        📁 {categoryNameById.get(c.category_id) ?? '카테고리 없음'}
                      </span>
                    </div>
                  )}
                  {c.summary && <p className="whitespace-pre-wrap text-sm text-slate-600">{c.summary}</p>}
                  {c.keywords && c.keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.keywords.map((k) => (
                        <span key={k} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                          #{k}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {SOURCE_LABELS[c.source_type]} · {c.source_input} · {new Date(c.created_at).toLocaleString('ko-KR')}
                  </p>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      <CategoryManagementModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onCategoriesUpdated={() => {
          if (!supabase) return
          loadCategories(supabase)
          supabase.auth.getUser().then(({ data }: any) => {
            if (data?.user) loadCandidates(supabase, data.user.id)
          })
        }}
      />
    </div>
  )
}
