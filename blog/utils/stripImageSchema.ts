// 이미지 생성 파이프라인이 각 섹션 이미지 프롬프트 뒤에 함께 남겨두는
// "⚙️ N번 이미지 생성 시 전송된 API 요청 스키마 (Paragraph N Payload)" 블록(설명 인용구 +
// 뒤따르는 JSON 코드블록)만 걷어낸다. 프롬프트 텍스트 코드블록은 그대로 남긴다.
const SCHEMA_BLOCK_PATTERN =
  /<blockquote[^>]*>\s*<strong>\s*⚙️[^<]*스키마[^<]*<\/strong>\s*<\/blockquote>\s*<div class="my-3 rounded-2xl[\s\S]*?<\/pre>\s*<\/div>/g

// 섹션 제목/설명문에 남아있는 "...및 API 요청 스키마 (Prompts & API Schemas)" 같은
// 스키마 언급도 함께 정리해서, 더 이상 보여주지 않는 섹션을 제목에서만 언급하는
// 상태가 되지 않게 한다.
const SCHEMA_TITLE_SUFFIX_PATTERN = /\s*및\s*API\s*요청\s*스키마\s*\(Prompts\s*&amp;\s*API\s*Schemas\)/g
const SCHEMA_INTRO_PHRASE_PATTERN =
  /\s*및\s*<strong>실제\s*전송된\s*정식\s*API\s*요청\s*스키마\s*페이로드\(Request\s*Payload\s*Schema\)<\/strong>/g

export function stripImageGenerationSchema(html: string): string {
  if (!html) return html
  return html
    .replace(SCHEMA_BLOCK_PATTERN, '')
    .replace(SCHEMA_TITLE_SUFFIX_PATTERN, '')
    .replace(SCHEMA_INTRO_PHRASE_PATTERN, '')
}

// "🎨 생성 이미지 AI 프롬프트"(utils/news/generator.ts가 "### 🎨 생성 이미지 AI 프롬프트..."로
// 만드는 마크다운 → mdLiteToHtml이 <h3>로 변환)로 시작해서 콘텐츠 맨 끝까지 이어지는 섹션을
// 실제 본문과 분리해서 보여주기 위한 분할 유틸(사용자 지시, 2026-09-16 — "생성 이미지 AI
// 프롬프트가 콘텐츠 내용과 분리되도록 박스쳐서 분리"). 처음엔 이 섹션을 <div>로 감싸서
// Tiptap에 그대로 넘겼는데, Tiptap(ProseMirror)의 스키마에는 일반 <div> 노드가 없어서
// HTML을 파싱하는 순간 그 감싸는 div가 통째로 사라지는 것을 실제 배포 화면에서 확인했다
// (자식 콘텐츠만 살아남고 래퍼는 버려짐) — 그래서 이 섹션은 Tiptap 안에 넣지 않고,
// posts/[id]/edit/page.tsx가 본문과 이 섹션을 분리해서 본문만 RichTextEditor에 넘기고
// 이 섹션은 별도의 정적 박스(다이얼로그 바깥의 일반 div)로 렌더링한다.
const PROMPT_SECTION_HEADING_MARKER = '🎨 생성 이미지 AI 프롬프트'

export function splitImagePromptSection(html: string): { main: string; promptSection: string } {
  if (!html) return { main: html, promptSection: '' }
  const markerIdx = html.indexOf(PROMPT_SECTION_HEADING_MARKER)
  if (markerIdx === -1) return { main: html, promptSection: '' }
  const h3Idx = html.lastIndexOf('<h3', markerIdx)
  if (h3Idx === -1) return { main: html, promptSection: '' }
  return { main: html.slice(0, h3Idx), promptSection: html.slice(h3Idx) }
}
