'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/blog/utils/supabase/client'
import { getBlogBasePath } from '@/blog/utils/basePath'

interface Candidate {
  id: string
  source_type: 'http' | 'rss' | 'perplexity'
  source_input: string
  title: string
  summary: string
  keywords: string[]
  created_at: string
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

  const [method, setMethod] = useState<Method>('http')
  const [collecting, setCollecting] = useState(false)
  const [resultMsg, setResultMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

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
        router.push(`${getBlogBasePath()}/auth?redirect=${getBlogBasePath()}/candidates`)
        return
      }
      setUserEmail(user.email ?? null)
      await Promise.all([loadCandidates(supabase, user.id), loadNewsblurFeeds()])
      setLoading(false)
    })
  }, [supabase, router])

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
    handleCollect('/api/candidates/http', { url: httpUrl.trim() })
  }

  const handleRssSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFeedId) return
    const feed = newsblurFeeds.find((f) => f.id === selectedFeedId)
    handleCollect('/api/candidates/rss', { feedId: selectedFeedId, feedTitle: feed?.title ?? '' })
  }

  const handlePerplexitySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!perplexityTopic.trim()) return
    handleCollect('/api/candidates/perplexity', { topic: perplexityTopic.trim() })
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={basePath || '/'} className="text-xl font-black text-indigo-600 no-underline">
            AutoBlog
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
            {userEmail ? <span>{userEmail}</span> : <Link href={`${basePath}/auth`}>로그인</Link>}
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
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : candidates.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            아직 수집된 블로그 주제가 없습니다. 위에서 방식을 선택해 첫 주제를 만들어보세요.
          </div>
        ) : (
          <ul className="space-y-3">
            {candidates.map((c) => {
              const writeParams = new URLSearchParams({ topic: c.title })
              if (c.keywords && c.keywords.length > 0) writeParams.set('keywords', c.keywords.join(','))
              return (
                <li key={c.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">{c.title}</h3>
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={`${basePath}/write/ai-form?${writeParams.toString()}`}
                        className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-100"
                      >
                        이 주제로 글쓰기
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(c.id)}
                        disabled={deletingId === c.id}
                        className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === c.id ? '삭제 중...' : '삭제'}
                      </button>
                    </div>
                  </div>
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
    </div>
  )
}
