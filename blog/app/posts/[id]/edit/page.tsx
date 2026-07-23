'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

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
        
        // Base64 이미지를 [첨부 이미지 N] 표기로 변환
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

  // 에디터 서식 삽입 도구 유틸리티
  const insertFormatting = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end) || '텍스트'
    const replacement = `${prefix}${selectedText}${suffix}`

    const newContent = content.substring(0, start) + replacement + content.substring(end)
    setContent(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
    }, 0)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-400">게시글 편집기를 준비 중입니다...</p>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/blog/posts/${postId}`}
              className="text-slate-400 hover:text-white text-sm font-semibold transition-colors no-underline flex items-center gap-1"
            >
              ← 취소
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">✏️</span>
              <h1 className="text-lg font-bold text-white">게시글 에디터 (수정 페이지)</h1>
            </div>
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

      {/* Main Single Column Full-Width Editor */}
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col space-y-6">
        {/* 1. 카테고리 선택 탭 */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-lg">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>📂</span> 카테고리 설정 (다중 선택 가능)
            </label>
            <span className="text-xs text-slate-400 font-medium">
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
                    padding: '7px 16px',
                    borderRadius: '9999px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  {isSelected && <span style={{ fontSize: '12px' }}>✓</span>}
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. 제목 입력 섹션 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="게시글 제목을 입력하세요..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white text-lg font-extrabold placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors shadow-inner"
          />
        </div>

        {/* 3. 요약 설명 섹션 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">요약 설명 (Excerpt)</label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="게시글 요약 문구를 입력하세요..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-slate-300 placeholder-slate-600 text-sm focus:outline-none focus:border-blue-500 transition-colors resize-none shadow-inner"
          />
        </div>

        {/* 4. 에디터 전용 툴바 및 본문 내용 편집기 */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Editor Formatting Toolbar */}
          <div className="bg-slate-950/80 border-b border-slate-800 p-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
              <span>🛠️</span> 서식 도구:
            </span>

            <button
              type="button"
              onClick={() => insertFormatting('**', '**')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="굵게 (Bold)"
            >
              B 굵게
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('*', '*')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold italic rounded-lg transition-colors cursor-pointer"
              title="기울임 (Italic)"
            >
              I 기울임
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('## ')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="큰 제목 (H2)"
            >
              H2 큰제목
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('### ')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="소제목 (H3)"
            >
              H3 소제목
            </button>

            <div className="w-[1px] h-4 bg-slate-700 mx-1" />

            <button
              type="button"
              onClick={() => insertFormatting('> ')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="인용구"
            >
              💬 인용구
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('- ')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="글머리 기호"
            >
              • 목록
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('```\n', '\n```')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer font-mono"
              title="코드 블록"
            >
              &lt;/&gt; 코드
            </button>
            <button
              type="button"
              onClick={() => insertFormatting('\n\n---\n\n')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              title="구분선"
            >
              ― 구분선
            </button>

            <div className="ml-auto text-xs text-blue-400 font-semibold flex items-center gap-1">
              <span>🖼️</span> [첨부 이미지 N] 표기는 원본 이미지 보존 위치입니다
            </div>
          </div>

          {/* Main Full-Width Textarea Editor */}
          <textarea
            ref={textareaRef}
            rows={20}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="본문 내용을 입력하세요..."
            className="w-full bg-slate-900 p-6 text-slate-100 font-mono text-sm leading-relaxed focus:outline-none resize-y min-h-[500px]"
          />
        </div>
      </main>
    </div>
  )
}
