// 2026-11-20 편집기 글자수 표시(Master msg_b877863aba09). 생성기가 분량을 재는 기존 기준(countChars: 공백 제외, UTF-16 글자 단위 —
// 한글 한 음절 1자, 이모지 대부분 2자)을 그대로 재사용해, 편집 화면 숫자가 생성 목표(공백 제외 글자 수)와 같은 단위가 되게 한다.
// 세지 않는 것: HTML 태그·속성, 이미지 설명(figcaption), script/style, 코드 모드의 [첨부이미지 N] 표시. HTML 특수 기호는 실제 글자로 바꿔 센다.
import { countChars } from './news/promptRules'

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }

export function htmlToCountText(html: string): string {
  return String(html || '')
    .replace(/<(script|style|figcaption)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\[첨부이미지\s*\d+\]/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
      const key = code.toLowerCase()
      if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16))
      if (key.startsWith('#')) return String.fromCodePoint(Number(key.slice(1)))
      return ENTITIES[key] ?? whole
    })
}

export function bodyCharCount(html: string): number {
  return countChars(htmlToCountText(html))
}

/** 목표가 정해져 있을 때만 목표 대비 비율(정수 %). 목표가 없거나 이상하면 null — 화면은 목표 대비를 그리지 않는다. */
export function targetPercent(count: number, target: unknown): number | null {
  const goal = Number(target)
  if (!Number.isFinite(goal) || goal <= 0 || !Number.isFinite(count) || count < 0) return null
  return Math.round((count / goal) * 100)
}
