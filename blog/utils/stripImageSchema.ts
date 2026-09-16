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
// 에디터 화면에서만 실제 본문과 구분되는 박스로 감싼다(사용자 지시, 2026-09-16 — "생성 이미지
// AI 프롬프트 위에 콘텐츠 내용과 분리되도록 박스쳐서 분리"). 저장되는 실제 콘텐츠 구조는
// 건드리지 않도록, posts/[id]/edit/page.tsx가 화면에 보여줄 때만 감싸고 저장 직전에는
// unwrapImagePromptSection()으로 다시 풀어서 보낸다.
const PROMPT_SECTION_HEADING_MARKER = '🎨 생성 이미지 AI 프롬프트'
export const AI_IMAGE_PROMPT_BOX_CLASS = 'ai-image-prompt-box'
const AI_IMAGE_PROMPT_BOX_STYLE =
  'margin-top:2rem;padding:1.25rem 1.5rem;border:1px solid #e2e8f0;border-radius:0.75rem;background:#f8fafc;'

export function wrapImagePromptSection(html: string): string {
  if (!html || html.includes(AI_IMAGE_PROMPT_BOX_CLASS)) return html
  const markerIdx = html.indexOf(PROMPT_SECTION_HEADING_MARKER)
  if (markerIdx === -1) return html
  const h3Idx = html.lastIndexOf('<h3', markerIdx)
  if (h3Idx === -1) return html
  const before = html.slice(0, h3Idx)
  const section = html.slice(h3Idx)
  return `${before}<div class="${AI_IMAGE_PROMPT_BOX_CLASS}" style="${AI_IMAGE_PROMPT_BOX_STYLE}">${section}</div>`
}

const WRAP_OPEN_PATTERN = new RegExp(`<div class="${AI_IMAGE_PROMPT_BOX_CLASS}"[^>]*>`)

export function unwrapImagePromptSection(html: string): string {
  if (!html || !html.includes(AI_IMAGE_PROMPT_BOX_CLASS)) return html
  let result = html.replace(WRAP_OPEN_PATTERN, '')
  const lastDivIdx = result.lastIndexOf('</div>')
  if (lastDivIdx !== -1) {
    result = result.slice(0, lastDivIdx) + result.slice(lastDivIdx + '</div>'.length)
  }
  return result
}
