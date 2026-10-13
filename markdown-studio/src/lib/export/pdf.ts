// 텍스트 기반 PDF(글자 선택·검색 가능). 한글 글꼴은 Noto Sans KR(SIL OFL)을 PDF 만들 때에만 내려받아 임베드한다.
import { type Block, type Run } from "./blocks";
import { type PageOptions, marginPt, normalizePageOptions } from "./options";

// pdfmake 정의 객체는 느슨하게 만든다
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Def = any;

const LINK = "#4f46e5";
const HEADING_SCALE = [1.9, 1.6, 1.35, 1.2, 1.1, 1];

export function runToPdf(r: Run, base: number): Def {
  if (r.br) return { text: "\n" };
  const node: Def = { text: r.text };
  if (r.bold) node.bold = true;
  if (r.italic) node.italics = true;
  const deco: string[] = [];
  if (r.strike) deco.push("lineThrough");
  if (r.href) { node.link = r.href; node.color = LINK; deco.push("underline"); }
  if (deco.length) node.decoration = deco;
  if (r.code) { node.background = "#f1f3f5"; node.fontSize = base - 1; }
  return node;
}
const runsToPdf = (runs: Run[], base: number): Def[] => runs.map(r => runToPdf(r, base));

function listToPdf(b: Extract<Block, { k: "list" }>, base: number): Def {
  const tasks = b.items.some(i => i.checked !== null);
  const items = b.items.map(item => {
    const nodes: Def[] = [];
    item.blocks.forEach((blk, idx) => {
      if (idx === 0 && blk.k === "paragraph") {
        // Noto Sans KR에는 ☑·☐ 글자가 없어 글꼴에 있는 문자로 표시한다
        const prefix: Def[] = item.checked === null ? [] : [{ text: item.checked ? "[✓] " : "[  ] " }];
        nodes.push({ text: [...prefix, ...runsToPdf(blk.runs, base)] });
      } else nodes.push(blockToPdf(blk, base));
    });
    return nodes.length === 1 ? nodes[0] : { stack: nodes };
  });
  const margin = [0, 0, 0, 6];
  if (b.style === "bullet") return { ul: items, margin, ...(tasks ? { type: "none" } : {}) };
  return { ol: items, margin, type: b.style === "alpha" ? "lower-alpha" : "decimal", start: b.start };
}

function boxed(stack: Def[], fill: string, leftBar?: string): Def {
  return {
    table: { widths: ["*"], body: [[{ stack, fillColor: fill }]] }, margin: [0, 0, 0, 8],
    layout: {
      hLineWidth: () => 0, vLineWidth: (i: number) => (leftBar && i === 0 ? 3 : 0), vLineColor: () => leftBar ?? fill,
      paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 6, paddingBottom: () => 6,
    },
  };
}

export function blockToPdf(b: Block, base: number): Def {
  switch (b.k) {
    case "heading": return { text: runsToPdf(b.runs, base), fontSize: Math.round(base * HEADING_SCALE[b.level - 1] * 10) / 10, bold: true, margin: [0, b.level === 1 ? 4 : 12, 0, 6], };
    case "paragraph": return { text: runsToPdf(b.runs, base), margin: [0, 0, 0, 6] };
    case "list": return listToPdf(b, base);
    case "quote": return boxed(b.blocks.map(x => blockToPdf(x, base)), "#f5f7ff", "#818cf8");
    case "code": return boxed([{ text: b.text || " ", preserveLeadingSpaces: true, fontSize: base - 1.5, lineHeight: 1.3 }], "#f4f5f7");
    case "rule": return { table: { widths: ["*"], body: [[{ text: " ", fontSize: 2, border: [false, false, false, true] }]] }, layout: { hLineColor: () => "#cbd5e1", hLineWidth: (i: number) => (i === 1 ? 0.8 : 0), vLineWidth: () => 0 }, margin: [0, 6, 0, 10] };
    case "pageBreak": return { text: "", pageBreak: "after" };
    case "table": {
      const cell = (runs: Run[], i: number, head: boolean): Def => ({ text: runsToPdf(runs, base), alignment: b.aligns[i] ?? "left", bold: head || undefined, ...(head ? { fillColor: "#f7f8fb" } : {}) });
      const cols = b.head.length;
      return {
        table: { headerRows: 1, widths: Array(cols).fill("*"), body: [b.head.map((r, i) => cell(r, i, true)), ...b.rows.map(row => Array.from({ length: cols }, (_, i) => cell(row[i] ?? [], i, false)))] },
        layout: { hLineColor: () => "#d8dde5", vLineColor: () => "#d8dde5", hLineWidth: () => 0.6, vLineWidth: () => 0.6, paddingTop: () => 4, paddingBottom: () => 4 },
        margin: [0, 2, 0, 10], fontSize: base - 0.5,
      };
    }
  }
}

export function buildPdfDefinition(blocks: Block[], title: string, options?: Partial<PageOptions>): Def {
  const o = normalizePageOptions(options);
  const m = marginPt(o.margin);
  // 마지막 쪽 나눔은 빈 쪽을 만들지 않도록 제거
  const list = blocks.slice();
  while (list.length && list[list.length - 1].k === "pageBreak") list.pop();
  return {
    info: { title, creator: "AIMaster 마크다운 문서 자동화" },
    pageSize: o.size, pageOrientation: o.orientation, pageMargins: [m, m, m, m + 6],
    defaultStyle: { font: "Noto", fontSize: o.fontSize, lineHeight: 1.45 },
    content: list.length ? list.map(b => blockToPdf(b, o.fontSize)) : [{ text: " " }],
    footer: (page: number, pages: number) => ({ text: `${page} / ${pages}`, alignment: "center", fontSize: 8, color: "#94a3b8" }),
  };
}

/** 브라우저에서 PDF 파일(Blob) 생성. 글꼴 2개(약 12MB)를 PDF를 만들 때에만 내려받아 브라우저가 캐시한다 */
export async function renderPdfBlob(def: Def): Promise<Blob> {
  const mod = await import("pdfmake/build/pdfmake");
  const pdfMake = (mod as Def).default ?? mod;
  const base = `${location.origin}/fonts/`;
  pdfMake.addFonts({ Noto: { normal: `${base}NotoSansKR-Regular.ttf`, bold: `${base}NotoSansKR-Bold.ttf`, italics: `${base}NotoSansKR-Regular.ttf`, bolditalics: `${base}NotoSansKR-Bold.ttf` } });
  return await pdfMake.createPdf(def).getBlob();
}
