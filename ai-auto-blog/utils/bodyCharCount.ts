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
// 큰 base64 주소를 매번 변환하지 않도록, 일반 base64 주소는 짧은 자리값으로 바꿔 센다. 4차 보완(Mac msg_a99b15f2ec09): 원고에 이미 있는 글자와
// 겹칠 수 있는 「자리값 문자열 찾기」를 없앴다. 같은 원고를 자리값 길이만 다르게 두 번 변환해, 두 숫자의 차이로 「주소가 글자로 남은 횟수」를 구한다
// (첨부마다 늘린 길이를 서로 다른 자릿값으로 두어 한 번의 차이에서 첨부별 횟수를 분리). 원고 안의 어떤 글자도 찾지 않으므로 충돌이 없다.
// 계산이 맞지 않으면(자릿값이 너무 커지거나 차이가 설명되지 않으면) 실제 주소를 그대로 넣는 안전 경로로 센다. base64 형식이 아닌 주소는 항상 실제 값.
const PLAIN_BASE64_SRC = /^data:image\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i
const PLACEHOLDER_BASE = 8
const PLACEHOLDER_SPREAD_LIMIT = 4096
const occurrences = (text: string, key: string) => text.split(key).length - 1
const convertedCount = (source: string) => countChars(htmlToCountText(removeImagePromptSection(mdLiteToHtml(source))))

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

/** 서버 저장과 같은 치환(목록 순서대로, 정확한 표시만). pick이 돌려준 값으로 바꾼다. */
function substituteAttachments(markdown: string, sources: string[], pick: (src: string, index: number) => string): string {
  let out = markdown
  sources.forEach((src, idx) => {
    const key = `[첨부이미지 ${idx + 1}]`
    if (out.includes(key)) out = out.split(key).join(pick(src, idx))
  })
  return out
}

/** 코드 모드 원고(마크다운 라이트) — 서버 PUT과 같은 변환(첨부 표시 → DB 원본 주소, mdLiteToHtml)을 거친 뒤,
 *  변환된 HTML에 기존 프롬프트 섹션 분리 규칙(removeImagePromptSection)을 적용한 본문 의미로 센다. */
export function markdownBodyCharCount(markdown: unknown, attachments: unknown = []): number {
  try {
    const sources = Array.isArray(attachments) ? attachments.filter((item): item is string => typeof item === 'string') : []
    const original = typeof markdown === 'string' ? markdown : ''
    const direct = () => convertedCount(substituteAttachments(original, sources, (src) => src))

    // 5차·6차 보완(Mac msg_e76ff8708dd4 · msg_835f8d5ed29b): 형식이 검증된 base64 주소가 아닌 첨부가 하나라도 있으면
    // (주소 안의 글자나 주소 끝과 원고가 붙어 새 표시가 생길 수 있음) 최적화하지 않고 서버와 같은 순서·실제 주소로 센다.
    // 검증된 base64 주소는 대괄호·한글·공백을 가질 수 없어 표시를 만들거나 이어 붙일 수 없다.
    if (sources.some((src) => !PLAIN_BASE64_SRC.test(src))) return direct()

    // 자리값을 쓸 첨부(일반 base64이고 원고에 표시가 있는 것)와 첨부별 자릿값
    const plan: { index: number; uses: number; weight: number }[] = []
    let spread = 1
    sources.forEach((src, idx) => {
      const uses = occurrences(original, `[첨부이미지 ${idx + 1}]`)
      if (!uses || !PLAIN_BASE64_SRC.test(src)) return
      plan.push({ index: idx, uses, weight: spread })
      spread *= uses + 1
    })
    if (!plan.length || spread > PLACEHOLDER_SPREAD_LIMIT) return direct()

    const weightOf = new Map(plan.map((item) => [item.index, item.weight]))
    const placeholder = (src: string, idx: number, extra: number) =>
      weightOf.has(idx) ? src.slice(0, src.indexOf(',') + 1) + 'A'.repeat(PLACEHOLDER_BASE + extra) : src
    const shortCount = convertedCount(substituteAttachments(original, sources, (src, idx) => placeholder(src, idx, 0)))
    const longCount = convertedCount(substituteAttachments(original, sources, (src, idx) => placeholder(src, idx, weightOf.get(idx) || 0)))

    // 차이 = Σ(글자로 남은 횟수 × 자릿값). 낮은 자리부터 풀고, 설명되지 않으면 안전 경로.
    let rest = longCount - shortCount
    if (rest < 0) return direct()
    let count = shortCount
    for (const item of plan) {
      const shown = rest % (item.uses + 1)
      rest = (rest - shown) / (item.uses + 1)
      const src = sources[item.index]
      count += shown * (src.length - (src.indexOf(',') + 1 + PLACEHOLDER_BASE))
    }
    if (rest !== 0) return direct()
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
