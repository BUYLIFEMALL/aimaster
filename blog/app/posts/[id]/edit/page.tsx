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

/* ------------------------------------------------------------------ */
/*  Base64 -> [첨부 이미지 N] 표기 전환 유틸리티                        */
/* ------------------------------------------------------------------ */
function replaceBase64WithImageTags(contentStr: string): string {
  if (!contentStr || !contentStr.includes('data:image/')) {
    return contentStr
  }

  let updated = contentStr
  let searchIdx = 0
  let imageCounter = 1

  while (true) {
    const startIdx = updated.indexOf('data:image/', searchIdx)
    if (startIdx === -1) break

    let endIdx = updated.indexOf('"', startIdx)
    const endAlt1 = updated.indexOf("'", startIdx)
    const endAlt2 = updated.indexOf(")", startIdx)
    const endAlt3 = updated.indexOf(" ", startIdx)

    let validEnds = [endIdx, endAlt1, endAlt2, endAlt3].filter(idx => idx > startIdx)
    if (validEnds.length === 0) break

    endIdx = Math.min(...validEnds)

    const tag = `[첨부 이미지 ${imageCounter}]`
    updated = updated.slice(0, startIdx) + tag + updated.slice(endIdx)
    searchIdx = startIdx + tag.length
    imageCounter++
  }

  return updated
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

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 게시글 데이터 및 카테고리 로드
  useEffect(() => {
    if (!postId) return

    async function loadData() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`/api/posts/${postId}`)
        if (!res.ok) {
          throw new Error('게시글을 가져오는 데 실패했습니다. (Status: ' + res.status + ')')
        }

        const postData = await res.json()
        setTitle(postData.title || '')
        setExcerpt(postData.excerpt || '')
        
        // 지저분한 Base64 바이너리 스트링을 [첨부 이미지 1], [첨부 이미지 2] 표기로 깔끔하게 치환!
        const cleanedContent = replaceBase64WithImageTags(postData.content || '')
        setContent(cleanedContent)

        setSelectedCategoryIds(postData.category_ids || [])
        setCategories(postData.all_categories || [])

      } catch (err: any) {
        console.error('[Edit Page Load Error]:', err)
        setError(err.message || '게시글 정보를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [postId])

  // 카테고리 탭 클릭 토글 핸들러
  const toggleCategory = (catId: number) => {
    setSelectedCategoryIds(prev => 
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

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

      let json: any = {}
      try {
        json = await res.json()
      } catch (e) {
        json = { error: '서버 응답 파싱 실패 (Status: ' + res.status + ')' }
      }

      if (res.ok && json.success) {
        alert('게시글이 성공적으로 수정되었습니다.')
        window.location.href = `/blog/posts/${postId}`
      } else {
        alert('수정 실패: ' + (json.error || '알 수 없는 오류 (Status: ' + res.status + ')'))
      }
    } catch (err: any) {
      console.error('[Edit Submit Error]:', err)
      alert('서버 통신 오류: ' + (err.message || String(err)))
    } finally {
      setSaving(false)
    }
  }

  // 미리보기용 HTML 변환 ( [첨부 이미지 N] 태그를 시각적 뱃지 카드로 표현 )
  const liveHtml = useMemo(() => {
    let html = mdLiteToHtml(content)
    // [첨부 이미지 N] 태그 시각화
    html = html.replace(/\[첨부 이미지 (\d+)\]/g, (match, p1) => {
      return `<div class="my-4 p-3 rounded-xl bg-blue-950/60 border border-blue-500/30 text-blue-400 font-bold text-xs flex items-center justify-center gap-2"><span>🖼️</span> [첨부 이미지 ${p1} - 원본 고화질 보존]</div>`
    })
    return html
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
          {/* TOP CATEGORY SELECTOR (제목 위쪽 위치) */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>📂</span> 카테고리 선택 (다중 선택 가능)
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedCategoryIds.length}개 선택됨
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryIds.includes(cat.id)
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      backgroundColor: isSelected ? '#2563eb' : '#1e293b',
                      color: isSelected ? '#ffffff' : '#94a3b8',
                      fontWeight: isSelected ? '800' : '600',
                      border: isSelected ? '1px solid #3b82f6' : '1px solid #334155',
                      boxShadow: isSelected ? '0 4px 10px rgba(37, 99, 235, 0.3)' : 'none',
                      padding: '6px 14px',
                      borderRadius: '9999px',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease-in-out',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isSelected && <span style={{ fontSize: '11px' }}>✓</span>}
                    {cat.name}
                  </button>
                )
              })}
            </div>
          </div>

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
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">본문 내용 (Markdown / HTML)</label>
              <span className="text-[11px] text-blue-400 font-semibold">💡 [첨부 이미지 N] 표기는 원본 이미지 보존 위치입니다.</span>
            </div>
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
            {/* Category Tags in Preview */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {categories
                .filter((cat) => selectedCategoryIds.includes(cat.id))
                .map((cat) => (
                  <span
                    key={cat.id}
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  >
                    {cat.name}
                  </span>
                ))}
            </div>

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
