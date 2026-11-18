// 2026-11-19 WS-20261119-01 — 노션 공개 페이지를 브라우저에서 「웹 페이지, 전체」로 저장한 HTML 가져오기.
// 노션 화면 구조(notion-page-content·notion-*-block·data-block-id)를 흉내 낸 가짜 문서로 실제 parseHtml을 확인한다(서버·DB 없음).
// 기존 일반 HTML·Workspace 내보내기 HTML이 예전처럼 읽히는지도 함께 본다.
import { describe, expect, it } from 'vitest';
import { parseHtml } from '../../src/litpage/server/content/html.ts';

let seq = 0;
const blk = (kind: string, inner: string, extra = '') => `<div data-block-id="b${++seq}" class="notion-selectable notion-${kind}-block" ${extra}>${inner}</div>`;
const leaf = (html: string, style = '') => `<div><div><div placeholder=" " data-content-editable-leaf="true" style="${style}">${html}</div><div></div></div></div>`;
const emoji = (ch: string, suffix = '') => `<img class="notion-emoji" alt="${ch}${suffix}" src="data:image/gif;base64,R0lGOD">`;

const DOC = `<!DOCTYPE html><html class="notion-html"><head><title>탭 제목</title><style>.a{color:red}</style></head>
<body class="notion-body"><noscript><p>JavaScript must be enabled</p></noscript>
<div class="notion-topbar"><a href="#main">Skip to content</a><div>가짜 문서 제목</div><div role="button">Get Notion free</div></div>
<main><div class="notion-floating-table-of-contents"><div>떠 있는 목차 항목</div></div>
${blk('page', `<h1 placeholder="New page" data-content-editable-leaf="true">가짜 문서 제목 1/2</h1><div></div>`)}
<div class="layout-content"><div class="notion-page-content">
${blk('transclusion_reference', `<div class="notion-transclusion-block-component">${blk('bookmark', `<div role="figure"><div><a href="https://example.com/ch" role="link"><div><div>채널 이름</div><div>채널 설명 한 줄</div><div><img src="./x_files/fav.png"><div>https://example.com/ch</div></div></div></a></div></div>`)}</div>`)}
${blk('callout', `<div role="note" aria-roledescription="callout"><div style="background: var(--c-bluBacSec)"><div><div class="notion-record-icon">${emoji('📚', ' Callout icon')}</div></div><div>${blk('text', leaf('콜아웃 첫 줄'))}${blk('text', leaf('콜아웃 둘째 줄'))}</div></div></div>`)}
${blk('sub_header', `<div><h3 data-content-editable-leaf="true" placeholder="Heading 2">둘째 단계 제목</h3></div>`)}
${blk('sub_sub_header', `<div><h4 data-content-editable-leaf="true" placeholder="Heading 3">셋째 단계 제목</h4></div>`)}
${blk('text', leaf(`${emoji('💬')} 굵은 <span style="font-weight:600">글자</span>와 <div class="notion-inline-code-container"><span>FILE.md</span></div> 그리고 <a href="https://example.com/a" class="notion-link-token">링크</a>`))}
${blk('video', `<div><div role="figure"><div><iframe src="./x_files/AbCdEfGhI_1.html" frameborder="0"></iframe></div><div>${leaf('영상 설명')}<div role="button" aria-label="Add alt text">ALT</div></div></div></div>`)}
${blk('embed', `<div><iframe src="https://example.com/widget?x=1"></iframe></div>`)}
${blk('table_of_contents', `<div><a href="https://x.notion.site/p#b1"><div>둘째 단계 제목</div></a></div>`)}
${blk('divider', `<div><div role="separator"></div></div>`)}
${blk('bulleted_list', `<div><div class="notion-list-item-box-left"><div class="pseudoBefore"></div></div>${leaf('글머리 하나')}<div>${blk('bulleted_list', leaf('안쪽 글머리'))}</div></div>`)}
${blk('numbered_list', `<div><div class="notion-list-item-box-left"><span class="pseudoBefore"></span></div>${leaf('번호 하나')}</div>`)}
${blk('to_do', `<div><div class="notion-list-item-box-left"><input type="checkbox" disabled=""></div>${leaf('아직 안 한 일')}</div>`)}
${blk('to_do', `<div><div class="notion-list-item-box-left"><input type="checkbox" checked=""></div>${leaf('끝낸 일')}</div>`)}
${blk('to_do', `<div><div class="notion-list-item-box-left"><input type="checkbox"></div>${leaf('줄 그어진 일', 'text-decoration: line-through')}</div>`)}
${blk('code', `<div><div role="figure"><div><div class="line-numbers notion-code-block"><div data-content-editable-leaf="true" placeholder=" "><span class="token function">git</span> clone x\ncd x</div></div></div></div>​<div></div></div>`)}
${blk('table', `<div><div class="notion-table-content">${blk('table', `<div>${blk('table', `<div><table><tbody><tr class="notion-table-row"><th scope="col"><div class="notion-table-cell"><div class="notion-table-cell-text">항목</div></div></th><th scope="col"><div class="notion-table-cell"><div class="notion-table-cell-text">값</div></div></th></tr><tr class="notion-table-row"><td><div class="notion-table-cell"><div class="notion-table-cell-text">가</div></div></td><td><div class="notion-table-cell"><div class="notion-table-cell-text">나</div></div></td></tr></tbody></table></div>`)}</div>`)}</div></div>`)}
${blk('toggle', `<div>${leaf('접힌 제목')}<div>${blk('text', leaf('펼친 안쪽'))}</div></div>`)}
${blk('quote', leaf('인용 글'))}
${blk('column_list', `${blk('column', blk('text', leaf('왼쪽 단')))}${blk('column', blk('text', leaf('오른쪽 단')))}`)}
${blk('image', `<div><img src="./x_files/pic.png"></div>`)}
${blk('mystery_kind', leaf('모르는 종류의 글'))}
</div></div></main>
<div class="notion-overlay-container"><div>Copied link to clipboard</div></div></body></html>`;

const plain = (t: unknown) => (typeof t === 'string' ? t : ((t as [string][] | undefined) ?? []).map((d) => d[0]).join(''));
const flat = (bs: any[]): any[] => bs.flatMap((b) => [b, ...flat(b.children ?? [])]);

describe('노션 화면 HTML 가져오기', () => {
  const r = parseHtml(DOC);
  const all = flat(r.blocks);
  const one = (type: string, i = 0) => all.filter((b) => b.type === type)[i];

  it('제목은 페이지 제목 블록에서, 본문은 notion-page-content 안만(화면 문구 제외)', () => {
    expect(r.title).toBe('가짜 문서 제목 1/2');
    const text = all.map((b) => plain(b.text)).join('|');
    for (const junk of ['Skip to content', 'Get Notion free', 'Copied link', '떠 있는 목차 항목', 'JavaScript must be enabled', 'ALT']) expect(text).not.toContain(junk);
    expect(all.filter((b) => b.type === 'header')).toHaveLength(0);
  });

  it('맨 위 순서와 종류가 원본과 같다', () => {
    expect(r.blocks.map((b) => b.type)).toEqual([
      'bookmark', 'callout', 'sub_header', 'sub_sub_header', 'text', 'video', 'embed', 'table_of_contents', 'divider',
      'bulleted_list', 'numbered_list', 'to_do', 'to_do', 'to_do', 'code', 'table', 'toggle', 'quote', 'column_list', 'text',
    ]);
  });

  it('북마크: 주소·제목·설명', () => {
    const b = one('bookmark');
    expect(b.url).toBe('https://example.com/ch');
    expect(plain(b.text)).toBe('채널 이름');
    expect(plain(b.props.description)).toBe('채널 설명 한 줄');
  });

  it('콜아웃: 아이콘·배경색·첫 줄은 본문, 나머지는 하위 블록', () => {
    const c = one('callout');
    expect(c.icon).toBe('📚');
    expect(c.format).toEqual({ block_color: 'blue_background' });
    expect(plain(c.text)).toBe('콜아웃 첫 줄');
    expect(c.children.map((k: any) => plain(k.text))).toEqual(['콜아웃 둘째 줄']);
  });

  it('제목 단계는 태그(h3·h4)가 아니라 노션 종류를 따른다', () => {
    expect(plain(one('sub_header').text)).toBe('둘째 단계 제목');
    expect(plain(one('sub_sub_header').text)).toBe('셋째 단계 제목');
  });

  it('글 안 꾸밈: 이모지 글자·굵게·인라인 코드·링크', () => {
    const t = all.find((b) => b.type === 'text' && plain(b.text).includes('FILE.md'));
    expect(plain(t.text)).toBe('💬 굵은 글자와 FILE.md 그리고 링크');
    const ann = (word: string) => (t.text as [string, [string, string?][]?][]).find((d) => d[0].includes(word))?.[1]?.map((a) => a[0]) ?? [];
    expect(ann('글자')).toContain('b');
    expect(ann('FILE.md')).toContain('c');
    expect((t.text as any[]).find((d) => d[0] === '링크')[1]).toEqual([['a', 'https://example.com/a']]);
  });

  it('영상: 저장하며 바뀐 「<id>.html」에서 유튜브 주소 복원 + 설명, 임베드는 원래 주소', () => {
    expect(one('video').url).toBe('https://www.youtube.com/watch?v=AbCdEfGhI_1');
    expect(plain(one('video').props.caption)).toBe('영상 설명');
    expect(one('embed').url).toBe('https://example.com/widget?x=1');
  });

  it('목록·할 일: 종류, 안쪽 목록, 체크 여부(checked 속성 또는 줄 그음)', () => {
    const bullet = r.blocks.find((b) => b.type === 'bulleted_list')!;
    expect(plain(bullet.text)).toBe('글머리 하나');
    expect(bullet.children!.map((k) => [k.type, plain(k.text)])).toEqual([['bulleted_list', '안쪽 글머리']]);
    expect(plain(one('numbered_list').text)).toBe('번호 하나');
    expect(all.filter((b) => b.type === 'to_do').map((b) => [plain(b.text), b.checked])).toEqual([['아직 안 한 일', false], ['끝낸 일', true], ['줄 그어진 일', true]]);
  });

  it('코드: 줄바꿈 유지, 보이지 않는 문자 없음', () => {
    expect(one('code').text).toBe('git clone x\ncd x');
    expect(all.map((b) => plain(b.text)).join('')).not.toContain('​');
  });

  it('표: 겹쳐 그려진 표 틀이 표 하나로, 머리 줄 인식', () => {
    const tables = all.filter((b) => b.type === 'table');
    expect(tables).toHaveLength(1);
    expect(tables[0].tableHeader).toBe(true);
    expect(tables[0].table.map((row: unknown[]) => row.map(plain))).toEqual([['항목', '값'], ['가', '나']]);
  });

  it('토글·인용·단 나눔·모르는 종류·주소 없는 그림', () => {
    expect(one('toggle').children.map((k: any) => plain(k.text))).toEqual(['펼친 안쪽']);
    expect(plain(one('quote').text)).toBe('인용 글');
    expect(one('column_list').children.map((c: any) => [c.type, c.children.map((k: any) => plain(k.text))])).toEqual([['column', ['왼쪽 단']], ['column', ['오른쪽 단']]]);
    expect(plain(r.blocks[r.blocks.length - 1].text)).toBe('모르는 종류의 글');
    expect(all.filter((b) => b.type === 'image')).toHaveLength(0); // 내 PC 경로(./x_files/…)는 깨진 그림이 되므로 넣지 않는다
  });

  it('그림 주소를 풀어 주는 함수가 있으면(ZIP 가져오기) 그 주소로 넣는다', () => {
    const z = parseHtml(DOC, { resolveImage: (src) => (src.endsWith('pic.png') ? 'https://files.example/pic.png' : null) });
    expect(flat(z.blocks).filter((b) => b.type === 'image').map((b) => b.url)).toEqual(['https://files.example/pic.png']);
  });
});

describe('기존 HTML 가져오기 회귀', () => {
  it('일반 HTML: 제목·문단·목록·코드·표', () => {
    const r = parseHtml('<html><head><title>문서</title></head><body><h1>큰 제목</h1><p>문단 <b>굵게</b></p><ul><li>하나</li><li>둘</li></ul><pre><code class="language-js">a\nb</code></pre><table><tr><th>ㄱ</th></tr><tr><td>ㄴ</td></tr></table><iframe src="https://example.com/x"></iframe></body></html>');
    expect(r.title).toBe('큰 제목');
    expect(r.blocks.map((b) => b.type)).toEqual(['text', 'bulleted_list', 'bulleted_list', 'code', 'table']);
    expect(r.blocks[3].text).toBe('a\nb');
  });

  it('Workspace 내보내기 HTML: page-title·page-body·할 일 목록', () => {
    const r = parseHtml('<html><body><header><h1 class="page-title">내보낸 제목</h1></header><div class="page-body"><ul class="to-do-list"><li><div class="checkbox checkbox-on"></div>끝남</li><li><div class="checkbox checkbox-off"></div>남음</li></ul><p>본문</p></div></body></html>');
    expect(r.title).toBe('내보낸 제목');
    expect(r.blocks.map((b) => [b.type, b.checked ?? null, plain(b.text)])).toEqual([['to_do', true, '끝남'], ['to_do', false, '남음'], ['text', null, '본문']]);
  });

  it('보이지 않는 문자(U+200B)는 노션 본문에서만 지운다 — 일반 HTML·내보내기 HTML은 그대로', () => {
    const zw = '​';
    const general = parseHtml(`<html><body><p>긴${zw}낱말 <b>굵${zw}게</b></p><ul><li>항${zw}목</li></ul><table><tr><td>칸${zw}안</td></tr></table></body></html>`);
    expect(plain(general.blocks[0].text)).toBe(`긴${zw}낱말 굵${zw}게`);
    expect(plain(general.blocks[1].text)).toBe(`항${zw}목`);
    expect(plain((general.blocks[2].table as unknown[][])[0][0])).toBe(`칸${zw}안`);
    const exported = parseHtml(`<html><body><header><h1 class="page-title">제목</h1></header><div class="page-body"><p>내${zw}보낸 글</p></div></body></html>`);
    expect(plain(exported.blocks[0].text)).toBe(`내${zw}보낸 글`);
    // 노션 문서를 읽은 바로 다음에 읽어도(같은 프로세스) 일반 문서는 그대로다 — 상태가 남지 않음
    const notion = parseHtml(`<html><body><div class="notion-page-content"><div data-block-id="z1" class="notion-selectable notion-text-block"><div data-content-editable-leaf="true">노${zw}션 글</div></div>${zw}</div></body></html>`);
    expect(notion.blocks.map((b) => plain(b.text))).toEqual(['노션 글']);
    expect(plain(parseHtml(`<p>다${zw}시</p>`).blocks[0].text)).toBe(`다${zw}시`);
  });

  it('ZIP처럼 문서 안에서 다른 문서를 이어 읽을 때(동기 재귀)도 문서마다 따로 정리한다', () => {
    const zw = '\u200b';
    const nBlock = (id: string, kind: string, inner: string) => `<div data-block-id="${id}" class="notion-selectable notion-${kind}-block">${inner}</div>`;
    const nLeaf = (t: string) => `<div data-content-editable-leaf="true">${t}</div>`;
    const docs: Record<string, string> = {
      'general.html': `<html><body><h1>일반 자식</h1><p>일${zw}반 자식 글</p></body></html>`,
      'notion.html': `<html><body><div class="notion-page-content">${nBlock('c1', 'text', nLeaf(`노${zw}션 자식 글`))}</div></body></html>`,
    };
    const ctx = {
      resolvePageLink: (href: string) => {
        const src = docs[href];
        if (!src) return null;
        const r = parseHtml(src, ctx);
        return { type: 'page' as const, text: r.title ?? href, children: r.blocks };
      },
    };
    // 노션 부모 → 일반 자식: 자식의 문자는 남고, 자식을 읽은 뒤 이어지는 부모 글은 계속 정리된다
    const notionParent = parseHtml(`<html><body><div class="notion-page-content">${nBlock('p1', 'text', nLeaf(`앞${zw}글`))}${nBlock('p2', 'page', `<a href="general.html"><div>일반 자식</div></a>`)}${nBlock('p3', 'page', `<a href="notion.html"><div>노션 자식</div></a>`)}${nBlock('p4', 'text', nLeaf(`뒤${zw}글`))}</div></body></html>`, ctx);
    expect(notionParent.blocks.map((b) => [b.type, plain(b.text)])).toEqual([['text', '앞글'], ['page', '일반 자식'], ['page', 'notion.html'], ['text', '뒤글']]);
    expect(notionParent.blocks[1].children!.map((b) => plain(b.text))).toEqual([`일${zw}반 자식 글`]);
    expect(notionParent.blocks[2].children!.map((b) => plain(b.text))).toEqual(['노션 자식 글']);
    // 일반 부모 → 노션 자식: 자식만 정리되고, 자식을 읽은 뒤 이어지는 부모 글은 그대로다
    const generalParent = parseHtml(`<html><body><p>앞${zw}글</p><a href="notion.html">노션 자식</a><p>뒤${zw}글</p></body></html>`, ctx);
    expect(generalParent.blocks.map((b) => [b.type, plain(b.text)])).toEqual([['text', `앞${zw}글`], ['page', 'notion.html'], ['text', `뒤${zw}글`]]);
    expect(generalParent.blocks[1].children!.map((b) => plain(b.text))).toEqual(['노션 자식 글']);
  });

  it('노션 본문의 하위 페이지 블록: 이어 읽을 문서가 없으면 링크 글로 남긴다', () => {
    const page = (href: string) => `<div data-block-id="s1" class="notion-selectable notion-page-block"><a href="${href}"><div>하위 문서</div></a></div>`;
    const web = parseHtml(`<div class="notion-page-content">${page('https://x.notion.site/sub')}</div>`);
    expect(web.blocks).toEqual([{ type: 'text', text: [['하위 문서', [['a', 'https://x.notion.site/sub']]]] }]);
    const local = parseHtml(`<div class="notion-page-content">${page('./sub.html')}</div>`);
    expect(local.blocks).toEqual([{ type: 'text', text: [['하위 문서']] }]);
  });

  it('노션 클래스 이름이 글에만 나오는 일반 문서는 노션 경로로 가지 않는다', () => {
    const r = parseHtml('<html><body><p>notion-page-content 라는 낱말</p><div class="notion-text-block">블록 id 없는 div</div></body></html>');
    expect(r.blocks.map((b) => plain(b.text))).toEqual(['notion-page-content 라는 낱말', '블록 id 없는 div']);
  });
});
