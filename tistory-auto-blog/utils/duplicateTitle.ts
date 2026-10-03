import 'server-only'
import * as cheerio from 'cheerio'

/** 제목을 Markdown 또는 간단한 HTML로 감싸도 같은 제목으로 비교한다. */
export function titleFingerprint(value: string): string {
  return String(value || '')
    .normalize('NFKC')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/^\s*(?:#{1,6}|>)\s*/, '')
    .replace(/[\*_`~]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

export function isDuplicateTitle(value: string, title: string): boolean {
  const target = titleFingerprint(title)
  return Boolean(target) && titleFingerprint(value) === target
}

/** 본문 Markdown의 독립된 제목 재출력 줄을 모두 제거한다. */
export function removeDuplicateTitleLines(markdown: string, title: string): string {
  if (!titleFingerprint(title)) return markdown
  return String(markdown || '')
    .split(/\r?\n/)
    .filter((line) => !isDuplicateTitle(line, title))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** 비주얼 편집기/확장 전송 HTML에서 제목만 담은 블록을 제거한다. */
export function removeDuplicateTitleHtml(rawHtml: string, title: string): string {
  if (!titleFingerprint(title) || !rawHtml) return rawHtml

  const $ = cheerio.load(`<div id="duplicate-title-root">${rawHtml}</div>`)
  const root = $('#duplicate-title-root')
  const standaloneSelector = 'h1,h2,h3,h4,h5,h6,p,div,span,strong,b'

  root.find(standaloneSelector).each((_, node) => {
    const element = $(node)
    const hasBlockChild = element.children('h1,h2,h3,h4,h5,h6,p,div,blockquote,ul,ol,figure,table').length > 0
    if (!hasBlockChild && isDuplicateTitle(element.text(), title)) element.remove()
  })

  root.contents().each((_, node) => {
    if (node.type === 'text' && isDuplicateTitle($(node).text(), title)) $(node).remove()
  })

  root.find('div,span').each((_, node) => {
    const element = $(node)
    if (!element.text().trim() && !element.children('img,br,hr,figure').length) element.remove()
  })

  return root.html() || ''
}
