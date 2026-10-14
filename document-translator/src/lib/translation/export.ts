import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  LevelFormat,
  ExternalHyperlink,
} from "docx";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type {
  RootContent,
  PhrasingContent,
  ListItem,
  Table as MdTable,
} from "mdast";
import { APP_NAME } from "../version";

function runs(
  nodes: PhrasingContent[],
  style: { bold?: boolean; italics?: boolean } = {},
): (TextRun | ExternalHyperlink)[] {
  return nodes.flatMap((node) => {
    if (node.type === "strong")
      return runs(node.children, { ...style, bold: true });
    if (node.type === "emphasis")
      return runs(node.children, { ...style, italics: true });
    if (node.type === "link")
      return /^https?:\/\/|^mailto:/i.test(node.url)
        ? [
            new ExternalHyperlink({
              link: node.url,
              children: runs(node.children, style).filter(
                (r): r is TextRun => r instanceof TextRun,
              ),
            }),
          ]
        : runs(node.children, style);
    if (node.type === "break") return [new TextRun({ text: "", break: 1 })];
    if (node.type === "text" || node.type === "inlineCode")
      return [
        new TextRun({
          text: node.value,
          ...style,
          ...(node.type === "inlineCode" ? { font: "Consolas" } : {}),
        }),
      ];
    return [];
  });
}
function blocks(
  nodes: RootContent[],
  list?: { ordered: boolean; level: number },
): (Paragraph | Table)[] {
  return nodes.flatMap((node) => {
    if (node.type === "heading")
      return [
        new Paragraph({
          heading:
            HeadingLevel[`HEADING_${node.depth}` as keyof typeof HeadingLevel],
          children: runs(node.children),
        }),
      ];
    if (node.type === "paragraph")
      return [
        new Paragraph({
          children: runs(node.children),
          ...(list
            ? list.ordered
              ? { numbering: { reference: "numbers", level: list.level } }
              : { bullet: { level: list.level } }
            : {}),
          spacing: { after: 120 },
        }),
      ];
    if (node.type === "list")
      return node.children.flatMap((item: ListItem) =>
        blocks(item.children as RootContent[], {
          ordered: Boolean(node.ordered),
          level: Math.min(8, list ? list.level + 1 : 0),
        }),
      );
    if (node.type === "table")
      return [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: (node as MdTable).children.map(
            (row, i) =>
              new TableRow({
                tableHeader: i === 0,
                children: row.children.map(
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          children: runs(cell.children, { bold: i === 0 }),
                        }),
                      ],
                    }),
                ),
              }),
          ),
        }),
      ];
    if (node.type === "blockquote")
      return blocks(node.children as RootContent[]);
    if (node.type === "code")
      return node.value
        .split("\n")
        .map(
          (text) =>
            new Paragraph({
              children: [new TextRun({ text, font: "Consolas" })],
            }),
        );
    if (node.type === "thematicBreak")
      return [new Paragraph({ text: "────────" })];
    return [];
  });
}
export async function markdownDocx(text: string) {
  const root = unified().use(remarkParse).use(remarkGfm).parse(text);
  const doc = new Document({
    creator: APP_NAME,
    numbering: {
      config: [
        {
          reference: "numbers",
          levels: Array.from({ length: 9 }, (_, level) => ({
            level,
            format: LevelFormat.DECIMAL,
            text: `%${level + 1}.`,
            style: {
              paragraph: { indent: { left: 720 + 360 * level, hanging: 260 } },
            },
          })),
        },
      ],
    },
    sections: [{ children: blocks(root.children) }],
  });
  return Packer.toBlob(doc);
}
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
