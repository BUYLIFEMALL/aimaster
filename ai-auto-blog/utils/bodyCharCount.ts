// 2026-11-20 편집기 글자수 표시(Master msg_b877863aba09). 생성기가 분량을 재는 기존 기준(countChars: 공백 제외, UTF-16 글자 단위 —
// 한글 한 음절 1자, 이모지 대부분 2자)을 그대로 재사용해, 편집 화면 숫자가 생성 목표(공백 제외 글자 수)와 같은 단위가 되게 한다.
// 보완(Mac msg_85d453cbcc0f · Master msg_4481ff5a213f):
// - HTML 판독은 이미 설치된 cheerio의 파싱 전용 입구(cheerio/slim)로 한다 — 원고를 실제 문서에 넣지 않고 스크립트·외부 요청을 실행하지 않는다.
//   속성 안의 `>`, 일반·숫자 엔티티(잘못된 숫자는 대체 문자 1자)를 표준대로 읽는다. 어떤 입력이든 예외 없이 숫자를 돌려준다(렌더 예외 방지).
// - 코드 모드는 서버 저장과 같은 의미로 센다: [첨부이미지 N] 표시를 빼고 utils/markdown.ts mdLiteToHtml로 바꾼 HTML을 같은 방식으로 센다.
// 세지 않는 것: 태그·속성, 이미지 설명(figcaption), script/style/noscript/template.
import { load } from 'cheerio/slim'
import { countChars } from './news/promptRules'
import { mdLiteToHtml } from './markdown'
import { removeImagePromptSection } from './stripImageSchema'

export function htmlToCountText(html: unknown): string {
  try {
    const $ = load(typeof html === 'string' ? html : '', null, false)
    $('script, style, noscript, template, figcaption').remove()
    return $.root().text()
  } catch {
    return ''
  }
}

export function bodyCharCount(html: unknown): number {
  try {
    return countChars(htmlToCountText(html))
  } catch {
    return 0
  }
}

// 2차·3차 보완(Mac msg_c48da43bc6ab · msg_9910402d9a22): 코드 모드 계수는 서버 PUT(app/api/posts/[id]/route.ts)의 저장 변환과 같게 한다.
// - 첨부 원본은 편집 화면에 들어올 때의 DB 원본 글에서 서버와 같은 방법(extractAttachmentSources)으로 뽑은 목록이 기준이다.
//   편집 중 추가·삭제한 미저장 이미지와는 무관하다(서버도 DB의 기존 글에서 뽑는다).
// - 치환은 서버와 같은 「정확한 문자열」 `[첨부이미지 N]`(N = 목록 순번, 1부터)만 — `01`·공백 다름·범위 밖 번호는 그대로 남는다.
// - 이미지 문법 안의 표시는 그림이 되어 설명 글까지 세지 않고, 혼자 있는 표시는 실제 저장처럼 그 주소 글자가 본문 글자로 세진다.
// 큰 base64 주소를 매번 변환하지 않도록, 일반 base64 주소는 짧은 자리값으로 바꿔 변환한 뒤 「글자로 남은 횟수 × (실제 길이 − 자리값 길이)」를
// 더한다(변환 결과가 같음을 시험으로 고정). base64 형식이 아닌 주소는 실제 값을 그대로 넣는다.
const PLAIN_BASE64_SRC = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]*$/i
const attachmentToken = (index: number) => `data:image/png;base64,ATT${index}ATT`

/** 서버 PUT의 extractBase64ImagesPureString과 같은 추출(주소 끝 = `"` 또는 `)` 중 먼저 나오는 곳, 없으면 최대 10,000자). */
export function extractAttachmentSources(content: unknown): string[] {
  const html = typeof content === 'string' ? content : ''
  const images: string[] = []
  let searchIndex = 0
  while (true) {
    const startIdx = html.indexOf('data:image/', searchIndex)
    if (startIdx === -1) break
    let endIdx = html.indexOf('"', startIdx)
    const endAltIdx = html.indexOf(')', startIdx)
    if (endIdx === -1 || (endAltIdx !== -1 && endAltIdx < endIdx)) endIdx = endAltIdx
    if (endIdx === -1) endIdx = Math.min(html.length, startIdx + 10000)
    images.push(html.slice(startIdx, endIdx))
    searchIndex = endIdx
  }
  return images
}

/** 코드 모드 원고(마크다운 라이트) — 서버 PUT과 같은 변환(첨부 표시 → DB 원본 주소, mdLiteToHtml)을 거친 뒤,
 *  변환된 HTML에 기존 프롬프트 섹션 분리 규칙(removeImagePromptSection)을 적용한 본문 의미로 센다. */
export function markdownBodyCharCount(markdown: unknown, attachments: unknown = []): number {
  try {
    const sources = Array.isArray(attachments) ? attachments.filter((item): item is string => typeof item === 'string') : []
    let source = typeof markdown === 'string' ? markdown : ''
    const adjust: { token: string; extra: number }[] = []
    sources.forEach((src, idx) => {
      const key = `[첨부이미지 ${idx + 1}]`
      if (!source.includes(key)) return
      if (PLAIN_BASE64_SRC.test(src)) {
        const token = attachmentToken(idx + 1)
        adjust.push({ token, extra: src.length - token.length })
        source = source.split(key).join(token)
      } else {
        source = source.split(key).join(src)
      }
    })
    const text = htmlToCountText(removeImagePromptSection(mdLiteToHtml(source)))
    let count = countChars(text)
    if (adjust.length) {
      const compact = text.replace(/\s+/g, '')
      for (const { token, extra } of adjust) count += (compact.split(token).length - 1) * extra
    }
    return Math.max(0, count)
  } catch {
    return 0
  }
}

/** 목표가 정해져 있을 때만 목표 대비 비율(정수 %). 목표가 없거나 이상하면 null — 화면은 목표 대비를 그리지 않는다. */
export function targetPercent(count: number, target: unknown): number | null {
  const goal = Number(target)
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(count) || count < 0) return null
  return Math.round((count / goal) * 100)
}
