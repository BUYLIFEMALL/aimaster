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
