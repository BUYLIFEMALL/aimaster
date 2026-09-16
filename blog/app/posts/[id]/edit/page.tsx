'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Bold,
  Italic,
  Heading2,
  Heading3,
  Quote,
  List,
  Link as LinkIcon,
  Eye,
  Code,
  Folder,
  Check,
  SquarePen,
} from 'lucide-react'
import { getBlogBasePath } from '@/blog/utils/basePath'
import { stripImageGenerationSchema, splitImagePromptSection } from '@/blog/utils/stripImageSchema'
import RichTextEditor from '@/blog/components/RichTextEditor'

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

interface Category {
  id: number
  name: string
  slug: string
}

/* ------------------------------------------------------------------ */
/*  Base64 -> [첨부이미지 N] 표기 전환 유틸리티                        */
/*  주의: 이 태그 문자열("첨부이미지", 공백 없음)은 반드시                */
/*  app/api/posts/[id]/route.ts PUT 핸들러가 복원 시 찾는 키와           */
/*  정확히 일치해야 한다 — 예전엔 여기만 "첨부 이미지"(공백 있음)로       */
/*  써서 저장할 때 이미지가 복원 안 되고 이 텍스트가 그대로 남는 버그가    */
/*  있었다(2026-09-16, 에디터 개편 중 발견해 수정).                       */
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

    const tag = `[첨부이미지 ${imageCounter}]`
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

  // rawContent: DB 원본 그대로 (Base64 이미지 포함) — 비주얼 모드용
  const [rawContent, setRawContent] = useState('')
  // codeContent: [첨부이미지 N] 태그로 치환된 경량 텍스트 — 코드 모드용
  const [codeContent, setCodeContent] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([])

  // 듀얼 에디터 모드
  const [editorMode, setEditorMode] = useState<'visual' | 'code'>('visual')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 카카오톡 자동화(kakao_auto_poster) 편집기를 검토한 뒤, 네이버 카페 자동화에 이어 이
  // 에디터에도 이식한 "링크 삽입" 기능 — 블로그는 실제 HTML을 그대로 저장/렌더링하므로
  // (네이버 카페와 달리 <a href> 태그가 escape되지 않는다) 실제 하이퍼링크로 삽입한다
  // (사용자 요청, 2026-09-16).
  const [showLinkPopover, setShowLinkPopover] = useState(false)
  const [linkUrlInput, setLinkUrlInput] = useState('')

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 1. 게시글 데이터 로드
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

        const json = await res.json()
        const postData = json.data ?? json
        setTitle(postData.title || '')
        setExcerpt(postData.excerpt || '')

        // ⚙️ 이미지 생성 API 요청 스키마 디버그 블록은 편집 화면에 보일 필요가 없어 제거한다.
        const original = stripImageGenerationSchema(postData.content || '')
        // rawContent는 항상 "본문 + AI 프롬프트 섹션"을 합친 실제 저장 형태 그대로 유지한다
        // (코드 모드·저장 모두 이 값을 그대로 쓴다). 화면에 박스로 분리해서 보여주는 건
        // 렌더링 시점에 splitImagePromptSection으로 나눠서 처리한다(아래 JSX 참고).
        setRawContent(original)
        // 코드 모드: Base64 이미지를 [첨부이미지 N] 으로 치환.
        setCodeContent(replaceBase64WithImageTags(original))

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

  // 에디터 서식 삽입 도구 유틸리티 — 코드 모드 전용(마크다운 문법 삽입). 비주얼 모드는
  // RichTextEditor(Tiptap) 자체 툴바가 서식을 전담하므로 이 함수를 거치지 않는다
  // (2026-09-16, kakao_auto_poster의 RichTextEditor 전체 이식에 맞춰 execCommand 분기 제거).
  const insertFormatting = (prefix: string, suffix = '') => {
    if (!textareaRef.current) return
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = codeContent.substring(start, end) || '텍스트'
    const replacement = `${prefix}${selectedText}${suffix}`

    const newContent = codeContent.substring(0, start) + replacement + codeContent.substring(end)
    setCodeContent(newContent)

    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
    }, 0)
  }

  // 링크 삽입 — 코드 모드 전용, 기존 서식 버튼들(## , > , - 등)과 동일하게 마크다운 문법
  // ([텍스트](URL))으로 넣는다. 비주얼 모드는 RichTextEditor 자체 링크 버튼(실제 <a href>)을 쓴다.
  const insertLink = () => {
    const raw = linkUrlInput.trim()
    if (!raw || !textareaRef.current) return
    const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = codeContent.substring(start, end) || '링크'
    const replacement = `[${selectedText}](${href})`
    const newContent = codeContent.substring(0, start) + replacement + codeContent.substring(end)
    setCodeContent(newContent)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + replacement.length, start + replacement.length)
    }, 0)

    setLinkUrlInput('')
    setShowLinkPopover(false)
  }

  // 모드 전환 핸들러 — rawContent는 RichTextEditor의 onChange로 항상 최신 상태라
  // 더 이상 DOM ref에서 innerHTML을 직접 읽어올 필요가 없다.
  const switchToVisual = () => {
    // 코드 모드에서 비주얼로 전환 시: codeContent는 그대로 유지 (rawContent는 원본 DB 이미지를 보존하고 있음)
    setEditorMode('visual')
  }

  const switchToCode = () => {
    setCodeContent(replaceBase64WithImageTags(rawContent))
    setEditorMode('code')
  }

  // 2. 수정 제출 (PUT /api/posts/[id]) - 원본 이미지 건드리지 않고 텍스트만 반영!
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      alert('제목을 입력해주세요.')
      return
    }

    try {
      setSaving(true)

      // 어떤 모드든 이미지를 [첨부이미지 N] 태그로 치환하여 경량 전송
      const finalContent = editorMode === 'visual' ? replaceBase64WithImageTags(rawContent) : codeContent

      const res = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          excerpt,
          content: finalContent,
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
        window.location.href = `${getBlogBasePath()}/posts/${postId}`
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

  // 비주얼 모드 렌더링용 — "생성 이미지 AI 프롬프트" 섹션을 본문에서 분리해, 본문만
  // RichTextEditor(Tiptap)에 넘기고 그 섹션은 별도의 정적 박스로 아래에 보여준다. rawContent
  // 자체(저장·코드 모드용)는 항상 둘을 합친 온전한 형태를 유지한다.
  const { main: visualMainContent, promptSection: visualPromptSection } = useMemo(
    () => splitImagePromptSection(rawContent),
    [rawContent],
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 text-neutral-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold text-neutral-500">듀얼 에디터 환경을 로딩하는 중입니다...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-neutral-900">
        <div className="bg-white border border-neutral-200 rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-lg">
          <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-bold text-neutral-900">{error}</h2>
          <Link
            href={`${getBlogBasePath()}/posts/${postId}`}
            className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-all cursor-pointer no-underline shadow-md"
          >
            ← 게시글로 돌아가기
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col">
      {/* Header Bar */}
      <header className="border-b border-neutral-200 bg-white/95 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`${getBlogBasePath()}/posts/${postId}`}
              className="text-neutral-500 hover:text-neutral-900 text-sm font-semibold transition-colors no-underline flex items-center gap-1"
            >
              <ArrowLeft size={15} /> 취소
            </Link>
            <div className="flex items-center gap-2">
              <SquarePen size={18} className="text-neutral-700" />
              <h1 className="text-lg font-bold text-neutral-900">스마트 에디터 (수정 페이지)</h1>
            </div>
            <a
              href={`${MAIN_SITE_URL}/programs`}
              className="text-neutral-500 hover:text-neutral-900 text-xs font-medium transition-colors no-underline hidden sm:inline"
            >
              ← 다른 프로그램 보기
            </a>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {saving ? '수정 중...' : <><Check size={15} /> 수정 완료</>}
          </button>
        </div>
      </header>

      {/* Main Single Column Editor */}
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col space-y-6">
        {/* 1. 카테고리 선택 탭 */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1.5">
              <Folder size={14} /> 카테고리 설정 (다중 선택 가능)
            </label>
            <span className="text-xs text-neutral-500 font-medium">
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
                  className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs transition-colors ${
                    isSelected
                      ? 'border-blue-600 bg-blue-600 text-white font-extrabold shadow-sm shadow-blue-600/20'
                      : 'border-neutral-300 bg-white text-neutral-600 font-semibold hover:bg-neutral-50'
                  }`}
                >
                  {isSelected && <Check size={12} />}
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. 제목 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="게시글 제목을 입력하세요..."
            className="w-full rounded-2xl border border-neutral-300 bg-white px-5 py-4 text-neutral-900 text-lg font-extrabold placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors shadow-sm"
          />
        </div>

        {/* 3. 요약 설명 */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider">요약 설명 (Excerpt)</label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="게시글 요약 문구를 입력하세요..."
            className="w-full rounded-2xl border border-neutral-300 bg-white p-4 text-neutral-900 text-sm placeholder-neutral-400 focus:outline-none focus:border-neutral-900 transition-colors resize-none shadow-sm"
          />
        </div>

        {/* 4. 듀얼 에디터 (비주얼 / 코드 탭 전환) */}
        <div className="flex-1 flex flex-col border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          {/* Mode Switcher — 비주얼 모드는 RichTextEditor(Tiptap) 자체 툴바를 쓰므로,
              여기서는 모드 전환 탭만 상시 보여준다(2026-09-16, kakao_auto_poster의
              RichTextEditor 전체 이식). */}
          <div className="border-b border-neutral-200 bg-neutral-50 p-3 flex items-center justify-end">
            <div className="flex items-center bg-neutral-100 rounded-xl p-1 gap-1">
              <button
                type="button"
                onClick={switchToVisual}
                className={`px-4 py-1.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'visual' ? 'bg-blue-600 text-white font-extrabold' : 'text-neutral-500 font-semibold hover:text-neutral-900'
                }`}
              >
                <Eye size={14} /> 비주얼
              </button>
              <button
                type="button"
                onClick={switchToCode}
                className={`px-4 py-1.5 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'code' ? 'bg-blue-600 text-white font-extrabold' : 'text-neutral-500 font-semibold hover:text-neutral-900'
                }`}
              >
                <Code size={14} /> 코드 (HTML)
              </button>
            </div>
          </div>

          {/* Visual Mode: kakao_auto_poster의 RichTextEditor(Tiptap) — 서식/색상/정렬/
              이미지 첨부/AI 이미지 생성/YouTube/표/실행취소까지 자체 툴바로 제공한다.
              "생성 이미지 AI 프롬프트" 섹션은 본문에 넘기지 않고 아래에 별도 박스로
              분리해서 보여준다(사용자 지시, 2026-09-16). */}
          {editorMode === 'visual' && (
            <>
              <RichTextEditor
                value={visualMainContent}
                onChange={(html) => setRawContent(html + visualPromptSection)}
                className="rounded-none border-0"
              />
              {visualPromptSection && (
                <div className="border-t border-neutral-200 bg-neutral-50 p-6">
                  <div
                    className="prose max-w-none rounded-xl border border-neutral-200 bg-white p-5 text-sm"
                    dangerouslySetInnerHTML={{ __html: visualPromptSection }}
                  />
                </div>
              )}
            </>
          )}

          {/* Code Mode: [첨부이미지 N] 태그로 경량화된 소스코드 에디터 — 마크다운 서식
              버튼은 이 모드 전용이다(비주얼 모드는 RichTextEditor 툴바가 대신한다). */}
          {editorMode === 'code' && (
            <>
              <div className="border-b border-neutral-200 bg-neutral-50 p-3 flex items-center gap-1 flex-wrap">
                <span className="text-xs font-bold text-neutral-500 mr-1 flex items-center gap-1">
                  🛠️ 서식:
                </span>
                <button type="button" onClick={() => insertFormatting('**', '**')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="굵게"><Bold size={14} /> 굵게</button>
                <button type="button" onClick={() => insertFormatting('*', '*')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="기울임"><Italic size={14} /> 기울임</button>
                <span className="mx-1 h-4 w-px bg-neutral-300" />
                <button type="button" onClick={() => insertFormatting('## ')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="H2"><Heading2 size={14} /> H2</button>
                <button type="button" onClick={() => insertFormatting('### ')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="H3"><Heading3 size={14} /> H3</button>
                <span className="mx-1 h-4 w-px bg-neutral-300" />
                <button type="button" onClick={() => insertFormatting('> ')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="인용구"><Quote size={14} /> 인용</button>
                <button type="button" onClick={() => insertFormatting('- ')} className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-neutral-600 text-xs font-bold hover:bg-neutral-200 hover:text-neutral-900 transition-colors" title="목록"><List size={14} /> 목록</button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLinkPopover((prev) => !prev)}
                    className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      showLinkPopover ? 'bg-neutral-200 text-neutral-900' : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                    }`}
                    title="링크 삽입"
                  >
                    <LinkIcon size={14} /> 링크
                  </button>
                  {showLinkPopover && (
                    <div className="absolute top-full left-0 z-20 mt-1 min-w-[280px] rounded-lg border border-neutral-200 bg-white p-3 shadow-xl">
                      <p className="mb-2 text-xs text-neutral-500">링크 URL</p>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={linkUrlInput}
                          onChange={(e) => setLinkUrlInput(e.target.value)}
                          placeholder="https://..."
                          className="flex-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                          onKeyDown={(e) => e.key === 'Enter' && insertLink()}
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={insertLink}
                          className="rounded bg-blue-100 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
                        >
                          삽입
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <div className="absolute top-3 right-4 text-xs text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 z-10">
                  🖼️ [첨부이미지 N] = 원본 이미지 보존 위치
                </div>
                <textarea
                  ref={textareaRef}
                  rows={20}
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  placeholder="HTML 또는 마크다운 코드를 입력하세요..."
                  className="w-full p-6 pt-12 bg-white text-neutral-800 font-mono text-sm leading-relaxed outline-none focus:outline-none resize-y min-h-[500px]"
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
