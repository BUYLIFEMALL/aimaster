import 'server-only'
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { removeImagePromptSection, stripImageGenerationSchema } from '@/blog/utils/stripImageSchema'

// BLOG 글(HTML)을 크롬 확장이 네이버 편집기에 순서대로 입력할 "블록"으로 바꾼다(2026-10-01).
// 네이버 편집기에는 한 글자씩 입력하므로 서식(굵게·소제목 크기·표 모양)은 남지 않는다 — 대신 읽기 좋은 일반 텍스트로 바꾼다.
// - 소제목(h2/h3): 앞의 "##" 같은 마크다운 흔적을 지운 한 줄
// - 목록: "• 항목" 줄
// - 링크: "글자 (주소)" — 주소가 사라지지 않게
// - 이미지(figure/img): 이미지 블록(확장이 내려받아 네이버에 파일로 올림)
// - 마지막 해시태그 줄(#태그 #태그): 본문에서 빼고 네이버 태그 추천값으로 돌려줌
// - 구분선(hr)·빈 문단은 건너뜀
export type InputBlock = { type: 'text'; text: string } | { type: 'image'; url: string; alt: string }

const clean = (value: string) =>
  value
    .replace(/ /g, ' ')
    .replace(/<\/li>\s*<li>/gi, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, '') // "&lt;li&gt;"처럼 글자로 들어간 태그 흔적
    .replace(/^\s*#{1,6}\s+/gm, '') // 소제목 앞 "## "(뒤에 띄어쓰기가 있을 때만 — #해시태그는 남김)
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()

function textWithLinks($: cheerio.CheerioAPI, node: AnyNode): string {
  const copy = $(node).clone()
  copy.find('a').each((_, a) => {
    const href = $(a).attr('href') || ''
    const label = $(a).text().trim()
    const url = /^https?:\/\//i.test(href) ? href : ''
    $(a).replaceWith(url ? (label && label !== url ? `${label} (${url})` : url) : label)
  })
  copy.find('br').replaceWith('\n')
  copy.find('figure, img, figcaption').remove()
  return clean(copy.text())
}

const imageAlt = (alt: string) => clean(alt).replace(/\s*비주얼$/, '')

export function htmlToInputBlocks(rawHtml: string): { blocks: InputBlock[]; tags: string[] } {
  const html = stripImageGenerationSchema(removeImagePromptSection(rawHtml || ''))
  const $ = cheerio.load(`<div id="root">${html}</div>`)
  const blocks: InputBlock[] = []
  const tags: string[] = []

  const pushText = (text: string) => {
    if (!text) return
    const last = blocks[blocks.length - 1]
    if (last?.type === 'text') last.text += `\n\n${text}`
    else blocks.push({ type: 'text', text })
  }
  const pushImages = (node: AnyNode) => {
    $(node).find('img').addBack('img').each((_, img) => {
      const src = $(img).attr('src') || ''
      if (/^https?:\/\//i.test(src)) blocks.push({ type: 'image', url: src, alt: imageAlt($(img).attr('alt') || '') })
    })
  }

  $('#root').contents().each((_, node) => {
    if (node.type === 'text') return pushText(clean($(node).text()))
    if (node.type !== 'tag') return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'hr' || tag === 'script' || tag === 'style') return
    if (tag === 'ul' || tag === 'ol') {
      const items = $(el).children('li').map((i, li) => {
        const text = textWithLinks($, li)
        return text ? `${tag === 'ol' ? `${i + 1}.` : '•'} ${text}` : ''
      }).get().filter(Boolean)
      return pushText(items.join('\n'))
    }
    if (tag === 'table') {
      const rows = $(el).find('tr').map((_, tr) => $(tr).children('th, td').map((__, cell) => clean($(cell).text())).get().join(' | ')).get()
      return pushText(rows.filter(Boolean).join('\n'))
    }
    const hasImage = $(el).is('img') || $(el).find('img').length > 0
    if (hasImage) {
      const before = textWithLinks($, el)
      pushImages(el)
      return pushText(before)
    }
    const text = textWithLinks($, el)
    // 해시태그만 있는 줄 → 네이버 태그로
    if (text && /^(#[^\s#]+\s*)+$/.test(text)) {
      for (const t of text.match(/#[^\s#]+/g) ?? []) tags.push(t.slice(1))
      return
    }
    pushText(text)
  })

  return { blocks, tags: [...new Set(tags)].slice(0, 30) }
}
