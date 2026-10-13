// 표준 Word(OOXML) 문서: 문단·제목·목록·표를 실제 요소로 만든다 (HTML을 통째로 넣는 altChunk 방식이 아님)
import {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, HeadingLevel, LevelFormat, Packer, PageNumber, PageOrientation,
  Paragraph, ShadingType, Table, TableCell, TableRow, TextRun, WidthType, PageBreak, type ILevelsOptions,
} from "docx";
import { type Block, type Run } from "./blocks";
import { type PageOptions, normalizePageOptions } from "./options";

type Child = Paragraph | Table;
const FONT = "Malgun Gothic"; // Windows·Mac Word에 있는 한글 글꼴. 없으면 Word가 대체 글꼴을 사용
const MONO = { ascii: "Consolas", hAnsi: "Consolas", eastAsia: FONT, cs: "Consolas" };
const HEADINGS = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6];
const HEADING_SCALE = [1.9, 1.6, 1.35, 1.2, 1.1, 1];
const LINK_COLOR = "4F46E5";
const MARGIN_TWIPS = { narrow: 567, normal: 850, wide: 1134 } as const; // 10·15·20mm
const PAGE_TWIPS = { A4: { width: 11906, height: 16838 }, LETTER: { width: 12240, height: 15840 } } as const;

function runToDocx(r: Run): TextRun | ExternalHyperlink {
  if (r.br) return new TextRun({ break: 1 });
  const common = {
    text: r.text, bold: r.bold, italics: r.italic, strike: r.strike,
    ...(r.code ? { font: MONO, shading: { type: ShadingType.CLEAR, fill: "F1F3F5", color: "auto" } } : {}),
  };
  if (r.href) return new ExternalHyperlink({ link: r.href, children: [new TextRun({ ...common, color: LINK_COLOR, underline: {} })] });
  return new TextRun(common);
}
const runs = (rs: Run[], prefix = "") => [...(prefix ? [new TextRun(prefix)] : []), ...rs.map(runToDocx)];

interface Ctx { lists: { reference: string; style: "bullet" | "decimal" | "alpha"; start: number }[] }

function levels(style: "bullet" | "decimal" | "alpha", start: number): ILevelsOptions[] {
  return Array.from({ length: 6 }, (_, level) => ({
    level,
    format: style === "bullet" ? LevelFormat.BULLET : style === "alpha" ? LevelFormat.LOWER_LETTER : LevelFormat.DECIMAL,
    text: style === "bullet" ? (["•", "◦", "▪"][level % 3]) : `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    start: level === 0 ? start : 1,
    style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
  }));
}

const QUOTE = { border: { left: { style: BorderStyle.SINGLE, size: 18, color: "818CF8", space: 8 } }, shading: { type: ShadingType.CLEAR, fill: "F5F7FF", color: "auto" } } as const;

function blocksToDocx(blocks: Block[], ctx: Ctx, level: number, indent: number, quote = false): Child[] {
  const out: Child[] = [];
  const q = quote ? QUOTE : {};
  for (const b of blocks) {
    switch (b.k) {
      case "heading": out.push(new Paragraph({ heading: HEADINGS[b.level - 1], children: runs(b.runs), indent: indent ? { left: indent } : undefined, ...q })); break;
      case "paragraph": out.push(new Paragraph({ children: runs(b.runs), spacing: { after: 120 }, indent: indent ? { left: indent } : undefined, ...q })); break;
      case "list": {
        const reference = `list-${ctx.lists.length}`;
        ctx.lists.push({ reference, style: b.style, start: b.start });
        for (const item of b.items) {
          item.blocks.forEach((blk, i) => {
            if (i === 0 && blk.k === "paragraph") {
              const prefix = item.checked === null ? "" : item.checked ? "☑ " : "☐ ";
              out.push(new Paragraph({
                children: runs(blk.runs, prefix), spacing: { after: 60 }, ...q,
                ...(item.checked === null ? { numbering: { reference, level: Math.min(level, 5) } } : { indent: { left: 720 + level * 360 } }),
              }));
            } else out.push(...blocksToDocx([blk], ctx, level + 1, 720 + (level + 1) * 360, quote));
          });
        }
        break;
      }
      case "quote": out.push(...blocksToDocx(b.blocks, ctx, level, indent + 360, true)); break;
      case "code": {
        const lines = b.text.split("\n");
        out.push(new Paragraph({
          children: lines.flatMap((line, i) => [new TextRun({ text: line || " ", font: MONO, size: 20, ...(i > 0 ? { break: 1 } : {}) })]),
          shading: { type: ShadingType.CLEAR, fill: "F4F5F7", color: "auto" }, spacing: { before: 60, after: 160 }, indent: { left: indent + 120, right: 120 },
        }));
        break;
      }
      case "rule": out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CBD5E1", space: 1 } }, spacing: { before: 120, after: 160 } })); break;
      case "pageBreak": out.push(new Paragraph({ children: [new PageBreak()] })); break;
      case "table": {
        const cols = b.head.length;
        const cell = (rs: Run[], i: number, head: boolean) => new TableCell({
          children: [new Paragraph({ children: rs.map(r => runToDocx(head ? { ...r, bold: true } : r)), alignment: b.aligns[i] === "center" ? AlignmentType.CENTER : b.aligns[i] === "right" ? AlignmentType.RIGHT : AlignmentType.LEFT })],
          shading: head ? { type: ShadingType.CLEAR, fill: "F7F8FB", color: "auto" } : undefined,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
        });
        out.push(new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: ["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].reduce((acc, k) => ({ ...acc, [k]: { style: BorderStyle.SINGLE, size: 4, color: "D8DDE5" } }), {}),
          rows: [
            new TableRow({ tableHeader: true, children: b.head.map((r, i) => cell(r, i, true)) }),
            ...b.rows.map(row => new TableRow({ children: Array.from({ length: cols }, (_, i) => cell(row[i] ?? [], i, false)) })),
          ],
        }));
        out.push(new Paragraph({ spacing: { after: 120 } }));
        break;
      }
    }
  }
  return out;
}

export function buildDocx(blocks: Block[], title: string, options?: Partial<PageOptions>): Document {
  const o = normalizePageOptions(options);
  const ctx: Ctx = { lists: [] };
  const children = blocksToDocx(blocks.filter((b, i, a) => !(b.k === "pageBreak" && i === a.length - 1)), ctx, 0, 0);
  const page = PAGE_TWIPS[o.size];
  const m = MARGIN_TWIPS[o.margin];
  const size = o.fontSize * 2;
  const headingStyle = (id: string, name: string, level: number) => ({
    id, name, basedOn: "Normal", next: "Normal", quickFormat: true,
    run: { font: FONT, bold: true, size: Math.round(size * HEADING_SCALE[level]), color: "172033" },
    paragraph: { spacing: { before: level === 0 ? 120 : 240, after: 120 }, keepNext: true },
  });
  return new Document({
    creator: "AIMaster 마크다운 문서 자동화", title,
    styles: {
      default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, eastAsia: FONT, cs: FONT }, size }, paragraph: { spacing: { line: 340 } } } },
      paragraphStyles: [1, 2, 3, 4, 5, 6].map(n => headingStyle(`Heading${n}`, `heading ${n}`, n - 1)),
    },
    numbering: { config: ctx.lists.map(l => ({ reference: l.reference, levels: levels(l.style, l.start) })) },
    sections: [{
      properties: { page: { size: { width: page.width, height: page.height, orientation: o.orientation === "landscape" ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: m, bottom: m, left: m, right: m } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 16, color: "94A3B8" })] })] }) },
      children: children.length ? children : [new Paragraph("")],
    }],
  });
}

export const renderDocxBlob = (doc: Document) => Packer.toBlob(doc);
export const renderDocxBuffer = (doc: Document) => Packer.toBuffer(doc);
