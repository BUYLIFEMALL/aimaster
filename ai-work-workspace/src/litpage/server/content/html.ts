// HTML → block specs (the "HTML" importer): tolerant tokenizer + tree builder, then block/inline mapping.
// Understands Workspace's HTML export (page-title header, to-do lists, callouts, toggles, simple tables).
// 2026-11-19 WS-20261119-01: 노션 공개 페이지를 브라우저에서 「웹 페이지, 전체」로 저장한 HTML도 읽는다 —
// 본문은 notion-page-content 안만(상단 바·목차 띠·알림 문구 제외), 블록은 notion-*-block 클래스로 종류를 판정한다.
import type { Annotation, Decoration, RichText } from '#shared/richtext.ts';
import type { Spec } from './spec.ts';
import { safeHref } from '#shared/url.ts';
import { codeLanguage } from './markdown.ts';

interface El {
  tag: string;
  attrs: Record<string, string>;
  children: Node[];
}
type Node = El | string;

const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'col', 'area', 'base', 'wbr', 'embed', 'track']);
const SKIP = new Set(['script', 'style', 'head', 'noscript', 'template', 'svg', 'iframe', 'nav', 'button', 'form', 'select']);
const BLOCK = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'pre', 'hr', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th',
  'img', 'figure', 'figcaption', 'details', 'summary', 'aside', 'section', 'article', 'header', 'footer', 'main', 'body', 'html', 'dl', 'dt', 'dd',
]);

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', hellip: '…', copy: '©', reg: '®', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•', middot: '·' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  return out;
}

export function parseHtmlTree(src: string): El {
  const root: El = { tag: 'root', attrs: {}, children: [] };
  const stack: El[] = [root];
  const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<\/?([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>|([^<]+|<)/gi;
  let m: RegExpExecArray | null;
  let skipDepth = 0;
  let skipTag = '';
  while ((m = re.exec(src))) {
    const whole = m[0];
    if (whole.startsWith('<!--') || /^<!doctype/i.test(whole)) continue;
    const top = stack[stack.length - 1];
    if (m[3] !== undefined) {
      if (!skipDepth) top.children.push(decodeEntities(m[3]));
      continue;
    }
    const tag = (m[1] ?? '').toLowerCase();
    const closing = whole.startsWith('</');
    if (skipDepth) {
      if (tag === skipTag) skipDepth += closing ? -1 : 1;
      continue;
    }
    if (!closing && SKIP.has(tag)) {
      // iframe 안쪽은 버리되 주소(src)는 남긴다 — 저장된 노션 페이지의 영상·임베드 블록이 읽는다
      if (tag === 'iframe') top.children.push({ tag, attrs: parseAttrs(m[2] ?? ''), children: [] });
      if (!/\/>$/.test(whole)) {
        skipDepth = 1;
        skipTag = tag;
      }
      continue;
    }
    if (closing) {
      for (let k = stack.length - 1; k > 0; k--) {
        if (stack[k].tag === tag) {
          stack.length = k;
          break;
        }
      }
      continue;
    }
    // implicit closes
    if (tag === 'li' || tag === 'p' || tag === 'tr' || tag === 'td' || tag === 'th' || tag === 'dt' || tag === 'dd') {
      const closeSet = tag === 'li' ? ['li'] : tag === 'p' ? ['p'] : tag === 'tr' ? ['tr', 'td', 'th'] : tag === 'dt' || tag === 'dd' ? ['dt', 'dd'] : ['td', 'th'];
      const limit = tag === 'li' ? ['ul', 'ol'] : tag === 'tr' || tag === 'td' || tag === 'th' ? ['table', 'thead', 'tbody', 'tfoot'] : [];
      for (let k = stack.length - 1; k > 0; k--) {
        if (limit.includes(stack[k].tag)) break;
        if (closeSet.includes(stack[k].tag)) {
          stack.length = k;
          break;
        }
        if (tag === 'p' && BLOCK.has(stack[k].tag)) break;
      }
    }
    const el: El = { tag, attrs: parseAttrs(m[2] ?? ''), children: [] };
    stack[stack.length - 1].children.push(el);
    if (!VOID.has(tag) && !/\/>$/.test(whole)) stack.push(el);
  }
  return root;
}

function find(el: El, pred: (e: El) => boolean): El | null {
  for (const c of el.children) {
    if (typeof c === 'string') continue;
    if (pred(c)) return c;
    const f = find(c, pred);
    if (f) return f;
  }
  return null;
}

function textOf(n: Node): string {
  return typeof n === 'string' ? n : n.tag === 'br' ? '\n' : n.children.map(textOf).join('');
}

function hasClass(el: El, c: string) {
  return (el.attrs.class ?? '').split(/\s+/).includes(c);
}

function isBlockEl(n: Node): boolean {
  return typeof n !== 'string' && (BLOCK.has(n.tag) || hasClass(n, 'callout'));
}

// ---------------- inline

/** 저장된 노션 본문을 읽는 동안만 참 — 노션 화면이 끼워 넣는 보이지 않는 문자(U+200B)를 그때만 지운다(일반 HTML은 그대로 둔다) */
let stripZeroWidth = false;

function inline(nodes: Node[], anns: Annotation[], out: Decoration[], pre = false) {
  for (const n of nodes) {
    if (typeof n === 'string') {
      const t0 = pre ? n : n.replace(/[ \t\r\n]+/g, ' ');
      const t = stripZeroWidth ? t0.replace(/\u200b/g, '') : t0;
      if (!t) continue;
      const last = out[out.length - 1];
      if (last && JSON.stringify(last[1] ?? []) === JSON.stringify(anns)) last[0] += t;
      else out.push(anns.length ? [t, anns.map((a) => [...a]) as Annotation[]] : [t]);
      continue;
    }
    const a: Annotation[] = [];
    if (hasClass(n, 'notion-inline-code-container')) a.push(['c']); // 노션 화면의 인라인 코드(div로 그려짐)
    switch (n.tag) {
      case 'b':
      case 'strong':
        a.push(['b']);
        break;
      case 'i':
      case 'em':
        a.push(['i']);
        break;
      case 'u':
        a.push(['_']);
        break;
      case 's':
      case 'del':
      case 'strike':
        a.push(['s']);
        break;
      case 'code':
        a.push(['c']);
        break;
      case 'mark':
        a.push(['h', 'yellow_background']);
        break;
      case 'a': {
        // imported links keep only navigable schemes (no javascript:/data: hrefs into the workspace)
        const href = n.attrs.href && !n.attrs.href.startsWith('#') ? safeHref(n.attrs.href) : null;
        if (href) a.push(['a', href]);
        break;
      }
      case 'br':
        inline(['\n'], anns, out, true);
        continue;
      case 'img':
        // 노션 화면의 이모지는 글자가 아니라 alt에 글자가 든 그림이다
        if (hasClass(n, 'notion-emoji') && n.attrs.alt) inline([n.attrs.alt], anns, out, true);
        continue;
      case 'span': {
        const st = n.attrs.style ?? '';
        if (/font-weight:\s*(bold|[6-9]00)/.test(st)) a.push(['b']);
        if (/font-style:\s*italic/.test(st)) a.push(['i']);
        if (/line-through/.test(st)) a.push(['s']);
        if (/underline/.test(st)) a.push(['_']);
        break;
      }
    }
    const next = [...anns, ...a.filter((x) => !anns.some((y) => y[0] === x[0]))];
    inline(n.children, next, out, pre);
  }
}

function richOf(nodes: Node[]): RichText {
  const out: Decoration[] = [];
  inline(nodes, [], out);
  // trim
  if (out.length) {
    out[0][0] = out[0][0].replace(/^\s+/, '');
    out[out.length - 1][0] = out[out.length - 1][0].replace(/\s+$/, '');
  }
  return out.filter((d) => d[0]);
}

// ---------------- blocks

function listItems(list: El, ordered: boolean, ctx: HtmlContext): Spec[] {
  const out: Spec[] = [];
  const todoList = hasClass(list, 'to-do-list');
  for (const c of list.children) {
    if (typeof c === 'string' || c.tag !== 'li') continue;
    const inlineNodes: Node[] = [];
    const blockNodes: Node[] = [];
    let checked: boolean | null = null;
    for (const k of c.children) {
      if (typeof k !== 'string' && k.tag === 'input' && (k.attrs.type ?? '').toLowerCase() === 'checkbox') {
        checked = 'checked' in k.attrs;
        continue;
      }
      if (typeof k !== 'string' && hasClass(k, 'checkbox')) {
        checked = hasClass(k, 'checkbox-on');
        continue;
      }
      if (typeof k !== 'string' && (k.tag === 'ul' || k.tag === 'ol' || k.tag === 'details' || k.tag === 'blockquote' || k.tag === 'pre' || k.tag === 'table' || k.tag === 'figure')) blockNodes.push(k);
      else if (blockNodes.length && typeof k !== 'string' && isBlockEl(k)) blockNodes.push(k);
      else inlineNodes.push(k);
    }
    if (todoList && checked === null) checked = false;
    const spec: Spec = checked !== null ? { type: 'to_do', checked, text: richOf(inlineNodes) } : { type: ordered ? 'numbered_list' : 'bulleted_list', text: richOf(inlineNodes) };
    const kids = blocks(blockNodes, ctx);
    if (kids.length) spec.children = kids;
    out.push(spec);
  }
  return out;
}

export interface HtmlContext {
  resolveImage?: (src: string) => string | null;
  resolvePageLink?: (href: string) => Spec | null;
}

function blocks(nodes: Node[], ctx: HtmlContext): Spec[] {
  const out: Spec[] = [];
  let pending: Node[] = [];
  const flushInline = () => {
    const rich = richOf(pending);
    pending = [];
    if (rich.length) out.push({ type: 'text', text: rich });
  };
  for (const n of nodes) {
    if (typeof n === 'string' || !isBlockEl(n)) {
      if (typeof n !== 'string' && n.tag === 'img') {
        flushInline();
        const src = ctx.resolveImage ? ctx.resolveImage(n.attrs.src ?? '') : n.attrs.src;
        if (src) out.push({ type: 'image', url: src });
        continue;
      }
      if (typeof n !== 'string' && n.tag === 'a' && ctx.resolvePageLink && pending.every((p) => typeof p === 'string' && !p.trim())) {
        const ps = ctx.resolvePageLink(n.attrs.href ?? '');
        if (ps) {
          pending = [];
          out.push(ps);
          continue;
        }
      }
      pending.push(n);
      continue;
    }
    flushInline();
    const notion = notionBlock(n, ctx);
    if (notion) {
      out.push(...notion);
      continue;
    }
    switch (n.tag) {
      case 'h1':
        out.push({ type: 'header', text: richOf(n.children) });
        break;
      case 'h2':
        out.push({ type: 'sub_header', text: richOf(n.children) });
        break;
      case 'h3':
        out.push({ type: 'sub_sub_header', text: richOf(n.children) });
        break;
      case 'h4':
      case 'h5':
      case 'h6':
        out.push({ type: 'header_4', text: richOf(n.children) });
        break;
      case 'p':
      case 'dt':
      case 'dd':
      case 'figcaption': {
        const hasBlock = n.children.some((k) => typeof k !== 'string' && (k.tag === 'img' || isBlockEl(k)));
        if (hasBlock) out.push(...blocks(n.children, ctx));
        else {
          const r = richOf(n.children);
          out.push({ type: 'text', text: r });
        }
        break;
      }
      case 'ul':
        out.push(...listItems(n, false, ctx));
        break;
      case 'ol':
        out.push(...listItems(n, true, ctx));
        break;
      case 'li':
        out.push({ type: 'bulleted_list', text: richOf(n.children.filter((k) => !isBlockEl(k))), children: blocks(n.children.filter(isBlockEl), ctx) });
        break;
      case 'blockquote': {
        const inner = blocks(n.children, ctx);
        const first = inner[0]?.type === 'text' ? inner.shift()! : null;
        out.push({ type: 'quote', text: first?.text ?? richOf(n.children.filter((k) => !isBlockEl(k))), children: inner });
        break;
      }
      case 'pre': {
        const code = find(n, (e) => e.tag === 'code');
        const cls = (code?.attrs.class ?? n.attrs.class ?? '').match(/language-([\w+#-]+)/);
        out.push({ type: 'code', text: textOf(code ?? n).replace(/\n$/, ''), language: codeLanguage(cls?.[1] ?? '') });
        break;
      }
      case 'hr':
        out.push({ type: 'divider' });
        break;
      case 'img': {
        const src = ctx.resolveImage ? ctx.resolveImage(n.attrs.src ?? '') : n.attrs.src;
        if (src) out.push({ type: 'image', url: src });
        break;
      }
      case 'figure': {
        if (hasClass(n, 'callout')) {
          out.push(callout(n, ctx));
          break;
        }
        const img = find(n, (e) => e.tag === 'img');
        const cap = find(n, (e) => e.tag === 'figcaption');
        if (img) {
          const src = ctx.resolveImage ? ctx.resolveImage(img.attrs.src ?? '') : img.attrs.src;
          if (src) out.push({ type: 'image', url: src, ...(cap ? { props: { caption: richOf(cap.children) } } : {}) });
        } else out.push(...blocks(n.children, ctx));
        break;
      }
      case 'aside':
        out.push(callout(n, ctx));
        break;
      case 'details': {
        const summary = n.children.find((k) => typeof k !== 'string' && k.tag === 'summary') as El | undefined;
        out.push({ type: 'toggle', text: summary ? richOf(summary.children) : [], children: blocks(n.children.filter((k) => k !== summary), ctx) });
        break;
      }
      case 'table': {
        const rows: RichText[][] = [];
        let header = false;
        const walk = (e: El) => {
          for (const k of e.children) {
            if (typeof k === 'string') continue;
            if (k.tag === 'tr') {
              const cells = k.children.filter((c): c is El => typeof c !== 'string' && (c.tag === 'td' || c.tag === 'th'));
              if (!rows.length && cells.some((c) => c.tag === 'th')) header = true;
              rows.push(cells.map((c) => richOf(c.children)));
            } else walk(k);
          }
        };
        walk(n);
        if (rows.length) out.push({ type: 'table', table: rows, tableHeader: header });
        break;
      }
      default:
        if (hasClass(n, 'callout')) out.push(callout(n, ctx));
        else out.push(...blocks(n.children, ctx));
    }
  }
  flushInline();
  return out;
}

function callout(n: El, ctx: HtmlContext): Spec {
  const iconEl = find(n, (e) => hasClass(e, 'icon'));
  const icon = iconEl ? textOf(iconEl).trim() : '💡';
  const rest = n.children.filter((k) => k !== iconEl && !(typeof k !== 'string' && iconEl && find(k, (e) => e === iconEl)));
  const inner = blocks(rest.length ? rest : n.children, ctx);
  const first = inner[0]?.type === 'text' ? inner.shift()! : null;
  return { type: 'callout', icon: icon || '💡', text: first?.text ?? [], format: { block_color: 'gray_background' }, children: inner };
}

// ---------------- 노션 화면 HTML(브라우저로 저장한 공개 페이지)

/** notion-<종류>-block 클래스 + data-block-id가 있는 요소의 종류(없으면 null) */
function notionKind(n: Node): string | null {
  if (typeof n === 'string' || !n.attrs['data-block-id']) return null;
  return /(?:^|\s)notion-([a-z_0-9]+)-block(?:\s|$)/.exec(n.attrs.class ?? '')?.[1] ?? null;
}

/** 바로 아래 단계의 노션 블록들(다른 블록 안쪽으로는 내려가지 않음) */
function notionKids(el: El): El[] {
  const out: El[] = [];
  const walk = (e: El) => {
    for (const c of e.children) {
      if (typeof c === 'string') continue;
      if (notionKind(c)) out.push(c);
      else walk(c);
    }
  };
  walk(el);
  return out;
}

/** 이 블록 자신의 요소 찾기(하위 블록 안쪽은 보지 않음) */
function notionFind(el: El, pred: (e: El) => boolean): El | null {
  for (const c of el.children) {
    if (typeof c === 'string' || notionKind(c)) continue;
    if (pred(c)) return c;
    const f = notionFind(c, pred);
    if (f) return f;
  }
  return null;
}

const NOTION_COLORS: Record<string, string> = { gra: 'gray', bro: 'brown', ora: 'orange', yel: 'yellow', gre: 'green', blu: 'blue', pur: 'purple', pin: 'pink', red: 'red' };

function notionBlock(n: El, ctx: HtmlContext): Spec[] | null {
  const kind = notionKind(n);
  if (!kind) return null;
  const leaf = notionFind(n, (e) => 'data-content-editable-leaf' in e.attrs);
  const text = (): RichText => (leaf ? richOf(leaf.children) : []);
  const kids = (): Spec[] => blocks(notionKids(n), ctx);
  const withKids = (spec: Spec): Spec[] => {
    const k = kids();
    if (k.length) spec.children = k;
    return [spec];
  };
  switch (kind) {
    case 'text':
      return withKids({ type: 'text', text: text() });
    case 'header':
      return [{ type: 'header', text: text() }, ...kids()];
    case 'sub_header':
      return [{ type: 'sub_header', text: text() }, ...kids()];
    case 'sub_sub_header':
      return [{ type: 'sub_sub_header', text: text() }, ...kids()];
    case 'bulleted_list':
      return withKids({ type: 'bulleted_list', text: text() });
    case 'numbered_list':
      return withKids({ type: 'numbered_list', text: text() });
    case 'toggle':
      return withKids({ type: 'toggle', text: text() });
    case 'quote':
      return withKids({ type: 'quote', text: text() });
    case 'to_do': {
      const box = notionFind(n, (e) => e.tag === 'input' && (e.attrs.type ?? '').toLowerCase() === 'checkbox');
      const checked = (!!box && ('checked' in box.attrs || box.attrs['aria-checked'] === 'true')) || /line-through/.test(leaf?.attrs.style ?? '');
      return withKids({ type: 'to_do', checked, text: text() });
    }
    case 'divider':
      return [{ type: 'divider' }];
    case 'code':
      return [{ type: 'code', text: leaf ? textOf(leaf).replace(/\u200b/g, '').replace(/\n$/, '') : '', language: codeLanguage('') }];
    case 'callout': {
      const iconEl = notionFind(n, (e) => hasClass(e, 'notion-emoji'));
      const icon = (iconEl?.attrs.alt ?? '').replace(/\s*Callout icon$/i, '').trim() || '💡';
      const bg = notionFind(n, (e) => /--c-[a-z]{3}Bac/.test(e.attrs.style ?? ''));
      const color = NOTION_COLORS[/--c-([a-z]{3})Bac/.exec(bg?.attrs.style ?? '')?.[1] ?? ''] ?? 'gray';
      const inner = kids();
      const first = inner[0]?.type === 'text' && !inner[0].children?.length ? inner.shift()! : null;
      return [{ type: 'callout', icon, text: first?.text ?? text(), format: { block_color: `${color}_background` }, children: inner }];
    }
    case 'bookmark': {
      const a = notionFind(n, (e) => e.tag === 'a' && !!e.attrs.href);
      const href = a?.attrs.href ? safeHref(a.attrs.href) : null;
      if (!a || !href) return kids();
      const parts: string[] = [];
      const collect = (e: El) => {
        for (const c of e.children) {
          if (typeof c === 'string') {
            if (c.trim()) parts.push(c.trim());
          } else collect(c);
        }
      };
      collect(a);
      const [title, desc] = parts.filter((t) => t !== a.attrs.href);
      return [{ type: 'bookmark', url: href, ...(title ? { text: title } : {}), ...(desc ? { props: { description: [[desc]] } } : {}) }];
    }
    case 'image': {
      const img = notionFind(n, (e) => e.tag === 'img' && !hasClass(e, 'notion-emoji'));
      const raw = img?.attrs.src ?? '';
      const src = ctx.resolveImage ? ctx.resolveImage(raw) : /^https?:\/\//i.test(raw) ? raw : null;
      const cap = text();
      if (src) return [{ type: 'image', url: src, ...(cap.length ? { props: { caption: cap } } : {}) }];
      return cap.length ? [{ type: 'text', text: cap }] : [];
    }
    case 'video':
    case 'embed':
    case 'audio':
    case 'pdf':
    case 'figma':
    case 'maps':
    case 'codepen':
    case 'gist':
    case 'loom':
    case 'tweet': {
      const frame = notionFind(n, (e) => e.tag === 'iframe');
      const raw = frame?.attrs.src ?? '';
      // 저장할 때 브라우저가 유튜브 영상 틀을 「<영상 id>.html」 파일로 바꿔 놓는다 — 파일 이름에서 id를 되살린다
      const yt = kind === 'video' ? /(?:^|\/)([A-Za-z0-9_-]{11})\.html?$/.exec(raw)?.[1] : undefined;
      const url = /^https?:\/\//i.test(raw) ? safeHref(raw) : yt ? `https://www.youtube.com/watch?v=${yt}` : null;
      const cap = text();
      if (url) return [{ type: kind === 'video' ? 'video' : 'embed', url, ...(cap.length ? { props: { caption: cap } } : {}) }];
      return cap.length ? [{ type: 'text', text: cap }] : [];
    }
    case 'table': {
      const table = find(n, (e) => e.tag === 'table');
      return table ? blocks([table], ctx) : kids();
    }
    case 'table_of_contents':
      return [{ type: 'table_of_contents' }];
    case 'column_list':
      return [{ type: 'column_list', children: notionKids(n).map((c) => ({ type: 'column' as const, children: blocks(notionKids(c), ctx) })) }];
    case 'page':
      return []; // 페이지 제목 블록 — 제목은 parseHtml이 따로 읽는다
    default: {
      // 모르는 종류(동기화 블록·데이터베이스 등): 하위 블록이 있으면 그것을, 없으면 글만
      const k = kids();
      if (k.length) return k;
      const t = text();
      return t.length ? [{ type: 'text', text: t }] : blocks(n.children, ctx);
    }
  }
}

/** Parse an HTML document → title + blocks. */
export function parseHtml(src: string, ctx: HtmlContext = {}): { title?: string; blocks: Spec[] } {
  const root = parseHtmlTree(src);
  // 노션 화면 HTML: 본문 영역만 읽고(화면 문구 제외), 제목은 페이지 제목 블록에서
  const notionBody = find(root, (e) => hasClass(e, 'notion-page-content'));
  if (notionBody) {
    const pageEl = find(root, (e) => notionKind(e) === 'page');
    const h = pageEl ? find(pageEl, (e) => 'data-content-editable-leaf' in e.attrs) : null;
    const t = h ? textOf(h).replace(/\u200b/g, '').trim() : '';
    stripZeroWidth = true;
    try {
      return { title: t || undefined, blocks: blocks(notionBody.children, ctx) };
    } finally {
      stripZeroWidth = false;
    }
  }
  const titleEl = find(root, (e) => e.tag === 'title');
  const pageTitle = find(root, (e) => (e.tag === 'h1' && hasClass(e, 'page-title')) || hasClass(e, 'page-title'));
  const body = find(root, (e) => hasClass(e, 'page-body')) ?? find(root, (e) => e.tag === 'body') ?? root;
  let title = pageTitle ? textOf(pageTitle).trim() : titleEl ? textOf(titleEl).trim() : undefined;
  let list = blocks(body.children.filter((k) => !(typeof k !== 'string' && (k === pageTitle || find(k, (e) => e === pageTitle) && k.tag === 'header'))), ctx);
  if (!title && list[0]?.type === 'header') {
    title = (list[0].text as RichText).map((d) => d[0]).join('');
    list = list.slice(1);
  }
  return { title: title || undefined, blocks: list };
}
