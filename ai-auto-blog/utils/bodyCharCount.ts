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

/** 코드 모드 원고(마크다운 라이트) — 서버 PUT과 같은 변환(첨부 표시 → 이미지, mdLiteToHtml)을 거친 본문 의미로 센다. */
export function markdownBodyCharCount(markdown: unknown): number {
  try {
    const source = (typeof markdown === 'string' ? markdown : '').replace(/\[첨부이미지\s*\d+\]/g, ' ')
    return bodyCharCount(mdLiteToHtml(source))
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
