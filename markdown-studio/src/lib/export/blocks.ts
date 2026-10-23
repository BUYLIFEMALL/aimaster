// 마크다운 → 내보내기용 중간 모델. PDF·DOCX가 같은 해석을 공유해 서로 어긋나지 않게 한다. 순수 함수(브라우저·Node 공용).
import { markdownParser } from "../markdown/parser";

export interface Run { text: string; bold?: boolean; italic?: boolean; strike?: boolean; code?: boolean; href?: string; br?: boolean }
export type Align = "left" | "center" | "right" | null;
export interface ListItem { checked: boolean | null; blocks: Block[] }
export type Block =
  | { k: "heading"; level: number; runs: Run[] }
  | { k: "paragraph"; runs: Run[] }
  | { k: "list"; style: "bullet" | "decimal" | "alpha"; start: number; items: ListItem[] }
  | { k: "quote"; blocks: Block[] }
  | { k: "code"; lang: string; text: string }
  | { k: "table"; aligns: Align[]; head: Run[][]; rows: Run[][][] }
  | { k: "rule" }
  | { k: "pageBreak" };

// marked 토큰은 형태가 다양해 느슨하게 다룬다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tok = any;

/** 링크 주소: http(s)·mailto만 허용 (javascript: 등은 글자만 남김) */
export const safeHref = (href: unknown): string | undefined => typeof href === "string" && /^(https?:\/\/|mailto:)/i.test(href.trim()) ? href.trim() : undefined;

const decodeEntities = (s: string) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " } as Record<string, string>)[e]);
/** 원본 HTML 조각은 서식 없이 글자만 남긴다 (script/style 내용 제외) */
export function htmlToText(html: string): string {
  return decodeEntities(html.replace(/<(script|style)[\s\S]*?<\/\1\s*>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "")).trim();
}

type Style = Omit<Run, "text" | "br">;
function inlineRuns(tokens: Tok[] | undefined, style: Style = {}): Run[] {
  const out: Run[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "text": case "escape":
        if (t.tokens?.length && t.type === "text") out.push(...inlineRuns(t.tokens, style));
        else if (t.text) out.push({ text: decodeEntities(String(t.text)), ...style });
        break;
      case "strong": out.push(...inlineRuns(t.tokens, { ...style, bold: true })); break;
      case "em": out.push(...inlineRuns(t.tokens, { ...style, italic: true })); break;
      case "del": out.push(...inlineRuns(t.tokens, { ...style, strike: true })); break;
      case "codespan": out.push({ text: decodeEntities(String(t.text)), ...style, code: true }); break;
      case "link": {
        const href = safeHref(t.href);
        out.push(...inlineRuns(t.tokens, href ? { ...style, href } : style));
        break;
      }
      case "image": { // 원격 이미지는 내려받아 넣지 않고 설명과 주소를 글자로 남긴다
        const href = safeHref(t.href);
        out.push({ text: `[이미지: ${t.text || "설명 없음"}]`, ...style, ...(href ? { href } : {}) });
        break;
      }
      case "br": out.push({ text: "\n", br: true }); break;
      case "checkbox": out.push({ text: t.checked ? "☑ " : "☐ ", ...style }); break;
      case "html": { const x = htmlToText(String(t.text)); if (x) out.push({ text: x, ...style }); break; }
      default: if (t.text) out.push({ text: decodeEntities(String(t.text)), ...style });
    }
  }
  // 이어진 같은 서식 조각 합치기
  const merged: Run[] = [];
  for (const r of out) {
    const prev = merged[merged.length - 1];
    if (prev && !prev.br && !r.br && prev.bold === r.bold && prev.italic === r.italic && prev.strike === r.strike && prev.code === r.code && prev.href === r.href) prev.text += r.text;
    else merged.push({ ...r });
  }
  return merged;
}

function listBlock(t: Tok, style: "bullet" | "decimal"): Block {
  return {
    k: "list", style, start: style === "decimal" ? Number(t.start) || 1 : 1,
    items: (t.items as Tok[]).map(item => {
      const blocks = tokensToBlocks(item.tokens);
      let checked: boolean | null = item.task ? !!item.checked : null;
      // 체크 표시가 글자 조각으로 들어온 경우 제거하고 상태만 남긴다
      const first = blocks[0];
      if (first && (first.k === "paragraph") && first.runs[0] && /^[☑☐] $/.test(first.runs[0].text)) {
        checked = first.runs[0].text.startsWith("☑");
        first.runs.shift();
      }
      return { checked, blocks };
    }),
  };
}

export function tokensToBlocks(tokens: Tok[] | undefined): Block[] {
  const out: Block[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "heading": out.push({ k: "heading", level: Math.min(6, Math.max(1, t.depth)), runs: inlineRuns(t.tokens) }); break;
      case "paragraph": case "text": { // 목록 안의 text 토큰 포함
        const runs = inlineRuns(t.tokens ?? [{ type: "text", text: t.text }]);
        if (runs.length) out.push({ k: "paragraph", runs });
        break;
      }
      case "list": out.push(listBlock(t, t.ordered ? "decimal" : "bullet")); break;
      case "alphaList": out.push({ k: "list", style: "alpha", start: 1, items: (t.items as Tok[][]).map(inline => ({ checked: null, blocks: [{ k: "paragraph", runs: inlineRuns(inline) }] })) }); break;
      case "blockquote": out.push({ k: "quote", blocks: tokensToBlocks(t.tokens) }); break;
      case "code": out.push({ k: "code", lang: t.lang || "", text: String(t.text).replace(/\n$/, "") }); break;
      case "hr": out.push({ k: "rule" }); break;
      case "table": out.push({
        k: "table",
        aligns: (t.align as Align[]) ?? [],
        head: (t.header as Tok[]).map(c => inlineRuns(c.tokens)),
        rows: (t.rows as Tok[][]).map(row => row.map(c => inlineRuns(c.tokens))),
      }); break;
      case "html": { const x = htmlToText(String(t.text)); if (x) out.push({ k: "paragraph", runs: [{ text: x }] }); break; }
      default: break; // space, def 등은 출력하지 않음
    }
  }
  return out;
}

export function markdownToBlocks(markdown: string): Block[] {
  return tokensToBlocks(markdownParser.lexer(markdown));
}

/** 여러 문서를 한 문서로 합친 블록: 파일 이름을 제목으로 넣고 파일 사이에 쪽 나눔을 둔다 */
export function mergeDocuments(docs: { name: string; markdown: string }[]): Block[] {
  const out: Block[] = [];
  docs.forEach((d, i) => {
    if (i > 0) out.push({ k: "pageBreak" });
    out.push({ k: "heading", level: 1, runs: [{ text: d.name.replace(/\.(md|markdown|txt)$/i, "") }] });
    out.push(...markdownToBlocks(d.markdown));
  });
  return out;
}

export const runsText = (runs: Run[]) => runs.map(r => r.text).join("");
