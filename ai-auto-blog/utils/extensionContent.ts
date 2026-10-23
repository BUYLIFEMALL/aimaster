import 'server-only'
import * as cheerio from 'cheerio'
import type { AnyNode, Element } from 'domhandler'
import { removeImagePromptSection, stripImageGenerationSchema } from '@/blog/utils/stripImageSchema'

// BLOG 글(HTML)을 크롬 확장이 네이버 편집기에 순서대로 입력할 "블록"으로 바꾼다(2026-10-01).
// 네이버 편집기에는 한 글자씩 입력하므로 서식(굵게·소제목 크기·표 모양)은 남지 않는다 — 대신 읽기 좋은 일반 텍스트로 바꾼다.
// - 소제목(h2/h3): 앞의 "##" 같은 마크다운 흔적을 지운 한 줄
// - 목록: "• 항목" 줄
// - 링크만 있는 줄(추천 링크 등): 링크 블록 — 확장이 실제 링크로 붙여넣는다
// - 문장 속 링크: "글자: 주소 " — 주소 뒤에 항상 띄어쓰기/줄바꿈(네이버 자동 링크용, 블록 끝이 주소면 띄어쓰기를 붙임)
// - 이미지(figure/img): 이미지 블록(확장이 내려받아 네이버에 파일로 올림)
// - 마지막 해시태그 줄(#태그 #태그): 본문에서 빼고 네이버 태그 추천값으로 돌려줌
// - 구분선(hr)·빈 문단은 건너뜀
export type InputBlock =
  | { type: 'text'; text: string }
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

export function htmlToInputBlocks(rawHtml: string, postTitle = ''): { blocks: InputBlock[]; tags: string[] } {
  const html = stripImageGenerationSchema(removeImagePromptSection(rawHtml || ''))
  const $ = cheerio.load(`<div id="root">${html}</div>`)
  const blocks: InputBlock[] = []
  const tags: string[] = []
  // 예전에 생성·저장한 글까지 포함해, 네이버 제목 칸에 이미 들어가는 글 제목과 정확히 같은
  // 단독 본문 블록(소제목·문단)은 확장 전송에서 한 번 더 넣지 않는다(제목 중복, tistory-auto-blog v1.39와 같은 방식, 2026-10-02).
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
    // 추천 링크(CTA) 상자: 예전 글은 "📢 추천링크 지금 바로 확인해 보세요: 👉 추천링크 바로가기" 처럼 이름이 두 번 들어가 있었다.
    // 링크 한 줄("👉 추천링크 바로가기: 주소")만 입력한다(2026-10-01 주인님 지시). 새 글은 generator가 처음부터 이 한 줄만 만든다.
    // 링크만 있는 줄(추천 링크 상자, 링크 하나뿐인 문단)은 "링크 블록"으로 보낸다 — 확장이 링크가 걸린 채로 붙여넣는다(실제 링크).
    const onlyLink = $(el).find('a').length === 1 && (/📢|👉/.test($(el).text()) || clean($(el).text()) === clean($(el).find('a').text()))
    if ((tag === 'blockquote' || tag === 'p') && onlyLink) {
      const link = $(el).find('a').first()
      const url = link.attr('href') || ''
      const text = clean(link.text())
      if (/^https?:\/\//i.test(url) && text) {
        blocks.push({ type: 'link', text, url })
        return
      }
    }
    const hasImage = $(el).is('img') || $(el).find('img').length > 0
    if (hasImage) {
      const before = textWithLinks($, el)
      pushImages(el)
      return pushText(before)
    }
    const text = textWithLinks($, el)
    if (isDuplicateTitle(text)) return
    // 해시태그만 있는 줄 → 네이버 태그로
    if (text && /^(#[^\s#]+\s*)+$/.test(text)) {
      for (const t of text.match(/#[^\s#]+/g) ?? []) tags.push(t.slice(1))
      return
    }
    pushText(text)
  })

  // 블록이 주소로 끝나면(뒤에 바로 이미지가 오는 경우 등) 띄어쓰기를 붙여 네이버 자동 링크가 걸리게 한다.
  for (const block of blocks) {
    if (block.type === 'text' && /https?:\/\/\S+$/.test(block.text)) block.text += ' '
  }
  return { blocks, tags: [...new Set(tags)].slice(0, 30) }
}
