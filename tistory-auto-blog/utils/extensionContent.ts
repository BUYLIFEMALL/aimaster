import 'server-only'
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { removeImagePromptSection, stripImageGenerationSchema } from '@/blog/utils/stripImageSchema'

// BLOG 글(HTML)을 티스토리 확장이 순서대로 입력할 "블록"으로 바꾼다.
// 텍스트만 한 글자씩 입력하면 제목 단계·굵게·목록·인용·표·링크가 모두 평문이 된다.
// 티스토리가 이해하는 안전한 의미 HTML은 보존하고, 이미지는 티스토리 서버에 실제 업로드되도록 별도 블록으로 보낸다.
export type InputBlock =
  | { type: 'text'; text: string }
  | { type: 'html'; html: string; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'link'; text: string; url: string } // 링크만 있는 줄 — 확장이 링크가 걸린 상태로 붙여넣음

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
    // 주소는 괄호 없이 쓰고 바로 뒤에 띄어쓰기를 둔다 — 네이버 편집기는 주소 뒤에 띄어쓰기·줄바꿈이 올 때 자동으로 링크를 건다.
    // 예전 "글자 (주소)"는 주소 바로 뒤가 ")"라서 링크가 걸리지 않았다(2026-10-01 주인님 확인, 추천링크.png).
    $(a).replaceWith(url ? (label && label !== url ? `${label}: ${url} ` : `${url} `) : label)
  })
  copy.find('br').replaceWith('\n')
  copy.find('figure, img, figcaption').remove()
  return clean(copy.text())
}

const imageAlt = (alt: string) => clean(alt).replace(/\s*비주얼$/, '')

const alignedBlockTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li', 'td', 'th'])

// 웹 앱의 정렬 표현만 티스토리가 이해하는 안전한 inline style로 옮긴다.
// 명시되지 않은 본문 블록은 이미지 뒤 커서의 가운데 정렬을 물려받지 않도록 왼쪽으로 고정한다.
function safeTextAlign(className: string, style: string): 'left' | 'center' | 'right' | 'justify' | '' {
  const inline = style.match(/(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\b/i)?.[1]?.toLowerCase()
  if (inline === 'left' || inline === 'center' || inline === 'right' || inline === 'justify') return inline
  const classes = className.split(/\s+/)
  if (classes.includes('text-left')) return 'left'
  if (classes.includes('text-center')) return 'center'
  if (classes.includes('text-right')) return 'right'
  if (classes.includes('text-justify')) return 'justify'
  return ''
}

function tistorySafeHtml($: cheerio.CheerioAPI, node: AnyNode): string {
  const copy = $(node).clone()
  // 웹 앱 전용 Tailwind class·복사 버튼·이벤트 속성은 티스토리에서 의미가 없거나 안전하지 않다.
  copy.find('script, style, button, svg, iframe, object, embed, form, input, textarea, select').remove()
  copy.find('*').addBack().each((_, node) => {
    const element = node as Element
    const attrs = element.attribs || {}
    const alignment = safeTextAlign(attrs.class || '', attrs.style || '')
    for (const name of Object.keys(attrs)) {
      if (name === 'class' || name === 'style' || name === 'id' || /^on/i.test(name) || /^data-/i.test(name)) {
        $(element).removeAttr(name)
      }
    }
    if (element.tagName === 'a') {
      const href = $(element).attr('href') || ''
      if (!/^https?:\/\//i.test(href)) $(element).removeAttr('href')
      else $(element).attr({ target: '_blank', rel: 'noopener noreferrer' })
    }
    if (alignment) $(element).attr('style', `text-align: ${alignment};`)
    else if (element.tagName && alignedBlockTags.has(element.tagName.toLowerCase())) $(element).attr('style', 'text-align: left;')
  })
  copy.find('img, figure, figcaption').remove()
  return $.html(copy).trim()
}

export function htmlToInputBlocks(rawHtml: string, postTitle = ''): { blocks: InputBlock[]; tags: string[] } {
  const html = stripImageGenerationSchema(removeImagePromptSection(rawHtml || ''))
  const $ = cheerio.load(`<div id="root">${html}</div>`)
  const blocks: InputBlock[] = []
  const tags: string[] = []
  const titleFingerprint = clean(postTitle).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
  const isDuplicateTitle = (value: string) => {
    const fingerprint = clean(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')
    return Boolean(titleFingerprint) && fingerprint === titleFingerprint
  }

  const pushText = (rawText: string) => {
    // 웹 화면용 이미지 설명("📷 … (클릭하여 고화질 확대)")은 네이버에 넣지 않는다 — 편집기(Tiptap)로 저장한 글은
    // figure가 풀려 설명이 따로 문단으로 남아 있어서 본문 글자로 입력되던 문제(2026-10-01 주인님 화면에서 발견).
    const text = rawText.split('\n').filter((line) => !/^📷.*고화질 확대\)?\s*$/.test(line.trim())).join('\n').replace(/\n{3,}/g, '\n\n').trim()
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
    if (node.type === 'text') {
      const text = clean($(node).text())
      if (!isDuplicateTitle(text)) pushText(text)
      return
    }
    if (node.type !== 'tag') return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'hr') {
      blocks.push({ type: 'html', html: '<hr>', text: '' })
      return
    }
    if (tag === 'script' || tag === 'style') return
    const hasImage = $(el).is('img') || $(el).find('img').length > 0
    if (hasImage) {
      const before = textWithLinks($, el)
      pushImages(el)
      return pushText(before)
    }
    const text = clean($(el).text())
    // 예전에 생성·저장한 글까지 포함해, 티스토리 제목과 정확히 같은 단독 본문 블록은
    // 제목 칸에 이미 입력되므로 확장 전송에서는 한 번 더 넣지 않는다.
    if (isDuplicateTitle(text)) return
    // 해시태그만 있는 줄 → 네이버 태그로
    if (text && /^(#[^\s#]+\s*)+$/.test(text)) {
      for (const t of text.match(/#[^\s#]+/g) ?? []) tags.push(t.slice(1))
      return
    }
    const html = tistorySafeHtml($, el)
    if (html && text) blocks.push({ type: 'html', html, text })
    else pushText(textWithLinks($, el))
  })

  // 블록이 주소로 끝나면(뒤에 바로 이미지가 오는 경우 등) 띄어쓰기를 붙여 네이버 자동 링크가 걸리게 한다.
  for (const block of blocks) {
    if (block.type === 'text' && /https?:\/\/\S+$/.test(block.text)) block.text += ' '
  }
  return { blocks, tags: [...new Set(tags)].slice(0, 30) }
}
