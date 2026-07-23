'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { mdLiteToHtml } from '@/blog/utils/markdown'

interface Category {
  id: number
  name: string
  slug: string
}

export default function PostEditPage() {
  const params = useParams()
  const postId = (params?.id as string) || ''
  const router = useRouter()

  const [title, setTitle] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [content, setContent] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [compressing, setCompressing] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 게시글 데이터 로드 (백엔드 /api/posts/[id] 직통 호출로 100% 보장)
  useEffect(() => {
    if (!postId) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        // API 직통 호출
        const res = await fetch(`/api/posts/${postId}`)
        if (!res.ok) {
          throw new Error('게시글을 가져오는 데 실패했습니다. (Status: ' + res.status + ')')
        }

        const postData = await res.json()
        setTitle(postData.title || '')
        setExcerpt(postData.excerpt || '')
        setContent(postData.content || '')

        // 카테고리 목록 로드 (실패 시 무시)
        try {
          const catRes = await fetch('/api/blog/categories')
          if (catRes.ok) {
            const catData = await catRes.json()
            setCategories(catData || [])
          }
        } catch (e) {}

      } catch (err: any) {
        console.error('[Edit Page Load Error]:', err)
        setError(err.message || '게시글 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [postId])

  // 2. 수정 제출 (PUT /api/posts/[id])
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)

      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content,
          category_ids: selectedCategoryIds
        })
      })

      const json = await res.json()

      if (res.ok && json.success) {
        alert('게시글이 성공적으로 수정되었습니다.')
        window.location.href = `/blog/posts/${postId}`
      } else {
        alert(json.error || '게시글 수정 중 오류가 발생했습니다.')
      }
    } catch (err: any) {
      console.error('[Edit Submit Error]:', err)
      alert('서버 통신 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const liveHtml = useMemo(() => {
    return mdLiteToHtml(content)
  }, [content])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-600">게시글 정보를 불러오는 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8 text-white">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-white">{error}</h2>
          <Link
            href={`/blog/posts/${postId}`}
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer no-underline shadow-md"
          >
            ← 게시글로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/blog/posts/${postId}`}
              className="text-slate-400 hover:text-white text-sm font-semibold transition-colors no-underline flex items-center gap-1"
            >
              ← 취소
            </Link>
            <h1 className="text-lg font-bold text-white">게시글 수정</h1>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '수정 중...' : '✓ 수정 완료'}
          </button>
        </div>
      </header>

      {/* Editor Content */}
      <div className="max-w-6xl mx-auto w-full px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Input Form */}
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="게시글 제목을 입력하세요..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-500 font-semibold focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">요약 설명 (Excerpt)</label>
            <textarea
              rows={2}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="게시글 요약 문구를 입력하세요..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">본문 내용 (Markdown / HTML)</label>
            <textarea
              ref={textareaRef}
              rows={16}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="마크다운 또는 HTML 형식으로 본문을 입력하세요..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-200 placeholder-slate-500 font-mono text-sm leading-relaxed focus:outline-none focus:border-blue-500 transition-colors resize-y min-h-[350px]"
            />
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col h-full overflow-hidden shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">실시간 뷰 미리보기</span>
            <span className="text-xs text-slate-500">Live Preview</span>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <h1 className="text-xl font-bold text-white leading-snug">{title || '제목 없음'}</h1>
            {excerpt && (
              <p className="text-sm text-slate-400 italic bg-slate-900/50 p-3 rounded-lg border border-slate-800/50">
                {excerpt}
              </p>
            )}
            <hr className="border-slate-800" />
            <div
              className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: liveHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
