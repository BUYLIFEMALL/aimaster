import 'server-only'
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { removeImagePromptSection, stripImageGenerationSchema } from '@/blog/utils/stripImageSchema'
import { isDuplicateTitle, removeDuplicateTitleHtml } from '@/blog/utils/duplicateTitle'

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

// 원문 편집기는 레이아웃용 div/span에도 text-align을 붙일 수 있다. 이를 티스토리로
// 넘기면 자식 문단 전체가 가운데/오른쪽 정렬로 상속돼 본문이 변형된다. 실제 글 블록에
// 명시한 정렬만 보존하고, 레이아웃 컨테이너의 정렬은 전달하지 않는다.
const alignedContentTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'li', 'td', 'th'])

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

const TISTORY_SAFE_STYLE_PROPERTIES = new Set([
  'text-align', 'color', 'background-color', 'font-weight', 'font-style', 'text-decoration',
  'font-size', 'line-height', 'letter-spacing', 'margin', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'padding', 'padding-top', 'padding-right', 'padding-bottom',
  'padding-left', 'border', 'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-color', 'border-style', 'border-width', 'border-radius', 'list-style-type',
])

function safeInlineStyle(style: string): string[] {
  return String(style || '').split(';').flatMap((declaration) => {
    const separator = declaration.indexOf(':')
    if (separator < 1) return []
    const property = declaration.slice(0, separator).trim().toLowerCase()
    const value = declaration.slice(separator + 1).trim()
    // 정렬은 아래에서 실제 콘텐츠 블록일 때만 별도로 처리한다. 컨테이너 정렬의
    // 상속으로 본문 전체가 변형되는 것을 방지한다.
    if (property === 'text-align' || !TISTORY_SAFE_STYLE_PROPERTIES.has(property) || !value || /url\s*\(|expression\s*\(|@import|javascript:/i.test(value)) return []
    return [`${property}: ${value}`]
  })
}

// BLOG 본문은 Tailwind 클래스로 시각 서식을 표현한다. 티스토리에는 Tailwind CSS가 없으므로
// 레이아웃 클래스 전체를 옮기지 않고, 글의 의미를 보존하는 안전한 텍스트·인용·목록 스타일만
// 인라인 CSS로 번역한다.
function tailwindTextStyles(className: string): string[] {
  const classes = new Set(String(className || '').split(/\s+/).filter(Boolean))
  const styles: string[] = []
  const add = (value: string) => styles.push(value)
  const size = [
    ['text-xs', 'font-size: 0.75rem'], ['text-sm', 'font-size: 0.875rem'],
    ['text-base', 'font-size: 1rem'], ['text-lg', 'font-size: 1.125rem'],
    ['text-xl', 'font-size: 1.25rem'], ['text-2xl', 'font-size: 1.5rem'],
    ['text-3xl', 'font-size: 1.875rem'],
  ] as const
  size.forEach(([name, style]) => { if (classes.has(name)) add(style) })
  const weight = [
    ['font-medium', 'font-weight: 500'], ['font-semibold', 'font-weight: 600'],
    ['font-bold', 'font-weight: 700'], ['font-extrabold', 'font-weight: 800'], ['font-black', 'font-weight: 900'],
  ] as const
  weight.forEach(([name, style]) => { if (classes.has(name)) add(style) })
  if (classes.has('italic')) add('font-style: italic')
  if (classes.has('underline')) add('text-decoration: underline')
  if (classes.has('line-through')) add('text-decoration: line-through')
  if (classes.has('leading-relaxed')) add('line-height: 1.625')
  if (classes.has('leading-snug')) add('line-height: 1.375')
  if (classes.has('leading-tight')) add('line-height: 1.25')
  if (classes.has('list-disc')) add('list-style-type: disc')
  if (classes.has('list-decimal')) add('list-style-type: decimal')
  if (classes.has('border-l-4')) add('border-left-width: 4px')
  if (classes.has('border-b')) add('border-bottom-width: 1px')
  // 테두리 두께만 있고 모양(solid)이 없으면 티스토리에서 테두리가 보이지 않는다(v1.64: 인용 상자의 왼쪽 파란 줄·소제목 밑줄이 사라지던 원인). Tailwind는 border 클래스에 solid를 기본으로 깔아 준다.
  if (classes.has('border-solid') || classes.has('border-l-4') || classes.has('border-b')) add('border-style: solid')
  if (classes.has('list-inside')) add('list-style-position: inside')
  if (classes.has('list-inside') || classes.has('list-disc') || classes.has('list-decimal')) add('padding-left: 0')
  // 여백(m*/p*-N, 1 = 0.25rem): 웹 화면의 문단 간격·소제목 위아래 간격을 그대로 옮긴다(여백이 없으면 티스토리 본문이 붙어 보인다).
  for (const name of classes) {
    const match = /^(m|p)(t|r|b|l|x|y)?-(\d+(?:\.\d+)?)$/.exec(name)
    if (!match) continue
    const property = match[1] === 'm' ? 'margin' : 'padding'
    const number = Number(match[3])
    const value = number === 0 ? '0' : `${number * 0.25}rem`
    const sides = match[2] === 'x' ? ['left', 'right'] : match[2] === 'y' ? ['top', 'bottom'] : match[2] === 't' ? ['top'] : match[2] === 'r' ? ['right'] : match[2] === 'b' ? ['bottom'] : match[2] === 'l' ? ['left'] : []
    if (sides.length) sides.forEach((side) => add(`${property}-${side}: ${value}`))
    else add(`${property}: ${value}`)
  }
  if (classes.has('rounded-xl')) add('border-radius: 0.75rem')
  if (classes.has('rounded-r-xl')) add('border-radius: 0 0.75rem 0.75rem 0')
  const colors = [
    ['text-slate-900', 'color: #0f172a'], ['text-slate-800', 'color: #1e293b'], ['text-slate-700', 'color: #334155'],
    ['text-indigo-600', 'color: #4f46e5'], ['border-indigo-500', 'border-color: #6366f1'],
    ['border-slate-100', 'border-color: #f1f5f9'], ['border-slate-200', 'border-color: #e2e8f0'],
    ['bg-indigo-50/60', 'background-color: #eef2ff'], ['bg-indigo-50', 'background-color: #eef2ff'],
  ] as const
  colors.forEach(([name, style]) => { if (classes.has(name)) add(style) })
  return styles
}

function tistorySafeHtml($: cheerio.CheerioAPI, node: AnyNode): string {
  const copy = $(node).clone()
  // 웹 앱 전용 Tailwind class·복사 버튼·이벤트 속성은 티스토리에서 의미가 없거나 안전하지 않다.
  copy.find('script, style, button, svg, iframe, object, embed, form, input, textarea, select').remove()
  copy.find('*').addBack().each((_, node) => {
    const element = node as Element
    const attrs = element.attribs || {}
    const originalClass = String(attrs.class || '') // attribs는 아래에서 속성을 지우면 함께 바뀌므로 먼저 복사해 둔다
    const tagName = element.tagName?.toLowerCase() || ''
    const alignment = alignedContentTags.has(tagName) ? safeTextAlign(attrs.class || '', attrs.style || '') : ''
    const styles = [...tailwindTextStyles(attrs.class || ''), ...safeInlineStyle(attrs.style || '')]
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
    if (alignment) styles.push(`text-align: ${alignment}`)
    else if (alignedContentTags.has(tagName)) styles.push('text-align: left')
    // 웹 본문의 요약 인용 상자(파란 줄 + 옅은 배경)를 티스토리에 넣으면, 테마의 blockquote 장식(가운데 큰 따옴표 글리프)이 붙어 원문과 달라진다(v1.64, 주인님 화면).
    // 글리프는 테마 CSS라 인라인 스타일로 끌 수 없으므로, 우리가 만든 스타일 상자(Tailwind 클래스가 있는 blockquote)는 같은 모양을 한 문단으로 보낸다.
    // 클래스 없는 일반 blockquote는 그대로 인용으로 둔다. 웹 화면에서 이 상자는 기울임체이므로 같게 맞춘다.
    if (tagName === 'blockquote' && /(^|\s)(border-l|bg-)/.test(originalClass)) {
      element.name = 'p'
      styles.push('font-style: italic')
    }
    // 목록 항목 사이 간격(space-y-N): 항목마다 아래 간격을 준다.
    const spaceY = /(?:^|\s)space-y-(\d+(?:\.\d+)?)(?:\s|$)/.exec(originalClass)
    if (spaceY && (tagName === 'ul' || tagName === 'ol')) {
      $(element).children('li').each((_, li) => { $(li).attr('style', `margin-bottom: ${Number(spaceY[1]) * 0.25}rem; ${$(li).attr('style') || ''}`.trim()) })
    }
    if (styles.length) $(element).attr('style', [...new Set(styles)].join('; ') + ';')
  })
  copy.find('img, figure, figcaption').remove()
  return $.html(copy).trim()
}

export function htmlToInputBlocks(rawHtml: string, postTitle = ''): { blocks: InputBlock[]; tags: string[] } {
  const html = removeDuplicateTitleHtml(stripImageGenerationSchema(removeImagePromptSection(rawHtml || '')), postTitle)
  const $ = cheerio.load(`<div id="root">${html}</div>`)
  const blocks: InputBlock[] = []
  const tags: string[] = []
  const isDuplicatePostTitle = (value: string) => isDuplicateTitle(clean(value), postTitle)

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

  // Tiptap이 이미지와 여러 문단을 하나의 레이아웃 div로 감싸 저장한 기존 글도 있다.
  // 이전처럼 부모에 img가 있다는 이유로 전체를 textWithLinks()로 평탄화하면 이미지 뒤의
  // 소제목·문단·목록 서식과 줄바꿈이 한 덩어리 텍스트로 바뀐다. 컨테이너는 재귀적으로
  // 풀고, 실제 의미 블록과 이미지만 각각의 입력 블록으로 유지한다.
  const contentTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'ul', 'ol', 'table'])
  const containerTags = new Set(['div', 'section', 'article', 'main', 'aside', 'header', 'footer'])

  const processNode = (node: AnyNode) => {
    if (node.type === 'text') {
      const text = clean($(node).text())
      if (!isDuplicatePostTitle(text)) pushText(text)
      return
    }
    if (node.type !== 'tag') return
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    if (tag === 'hr') {
      blocks.push({ type: 'html', html: '<p style="margin: 1.5rem 0; padding: 0; border-top: 1px solid #e2e8f0; line-height: 1px; font-size: 1px;">&nbsp;</p>', text: '' })
      return
    }
    if (tag === 'script' || tag === 'style') return

    if (tag === 'img' || tag === 'figure') {
      pushImages(el)
      return
    }

    const children = $(el).contents().toArray() as AnyNode[]
    const hasBlockChild = children.some((child) => child.type === 'tag' && (
      contentTags.has((child as Element).tagName.toLowerCase()) ||
      containerTags.has((child as Element).tagName.toLowerCase()) ||
      (child as Element).tagName.toLowerCase() === 'figure' ||
      (child as Element).tagName.toLowerCase() === 'img'
    ))
    if (containerTags.has(tag) && hasBlockChild) {
      children.forEach(processNode)
      return
    }
    if (!contentTags.has(tag) && children.length && hasBlockChild) {
      children.forEach(processNode)
      return
    }

    const text = clean($(el).text())
    // 예전에 생성·저장한 글까지 포함해, 티스토리 제목과 정확히 같은 단독 본문 블록은
    // 제목 칸에 이미 입력되므로 확장 전송에서는 한 번 더 넣지 않는다.
    if (isDuplicatePostTitle(text)) return
    // 해시태그만 있는 줄 → 네이버 태그로
    if (text && /^(#[^\s#]+\s*)+$/.test(text)) {
      for (const t of text.match(/#[^\s#]+/g) ?? []) tags.push(t.slice(1))
      return
    }
    const html = tistorySafeHtml($, el)
    if (html && text) blocks.push({ type: 'html', html, text })
    else pushText(textWithLinks($, el))
  }

  $('#root').contents().each((_, node) => processNode(node))

  // 블록이 주소로 끝나면(뒤에 바로 이미지가 오는 경우 등) 띄어쓰기를 붙여 네이버 자동 링크가 걸리게 한다.
  for (const block of blocks) {
    if (block.type === 'text' && /https?:\/\/\S+$/.test(block.text)) block.text += ' '
  }
  return { blocks, tags: [...new Set(tags)].slice(0, 30) }
}
