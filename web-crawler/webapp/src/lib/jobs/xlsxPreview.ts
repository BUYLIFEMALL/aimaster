import "server-only";
import JSZip from "jszip";
import * as cheerio from "cheerio";

// 완료된 수집 엑셀(service/pipeline.py → scripts/export_excel.py, 시트 1개·1행 머리글)을 화면 표로 미리 보여 주기 위한 해석기.
// 2026-11-18 T-07. 이미 쓰는 jszip·cheerio만 사용(새 의존성 0). 수식 계산·서식은 보지 않고 값만 읽는다.

export const PREVIEW_LIMITS = {
  rows: 20, // 화면에 보여 줄 데이터 행
  cols: 30, // 화면에 보여 줄 열
  cellChars: 300, // 한 칸 글자 수(넘으면 자르고 "…")
  fileBytes: 10 * 1024 * 1024, // 내려받은 엑셀 파일 크기 상한
  xmlBytes: 16 * 1024 * 1024, // 압축을 푼 시트·공유 문자열 한 파일 상한(압축 폭탄 방지)
} as const;

export type XlsxPreview = {
  headers: string[];
  rows: string[][];
  totalRows: number; // 머리글을 뺀 전체 데이터 행 수
  truncatedRows: boolean;
  truncatedCols: boolean;
};

export class XlsxPreviewError extends Error {
  constructor(public code: "not_xlsx" | "too_large", message: string) {
    super(message);
  }
}

function clip(text: string): string {
  return text.length > PREVIEW_LIMITS.cellChars ? `${text.slice(0, PREVIEW_LIMITS.cellChars)}…` : text;
}

/** "AB12" → 27 (0부터). 열 글자가 없으면 -1. */
function columnIndex(ref: string | undefined): number {
  const letters = /^([A-Z]+)/i.exec(ref ?? "")?.[1];
  if (!letters) return -1;
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function readText(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  // jszip이 중앙 디렉터리에서 읽어 둔 "풀었을 때 크기"로 먼저 거른다 — 풀기 전에 막는다.
  const declared = (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (typeof declared === "number" && declared > PREVIEW_LIMITS.xmlBytes) {
    throw new XlsxPreviewError("too_large", "결과 파일이 커서 미리보기를 만들 수 없습니다. 엑셀로 내려받아 확인해 주세요.");
  }
  const text = await file.async("string");
  if (text.length > PREVIEW_LIMITS.xmlBytes) {
    throw new XlsxPreviewError("too_large", "결과 파일이 커서 미리보기를 만들 수 없습니다. 엑셀로 내려받아 확인해 주세요.");
  }
  return text;
}

/** workbook.xml의 첫 시트 → 관계 파일 → 실제 시트 경로. 못 찾으면 기본 경로. */
async function firstSheetPath(zip: JSZip): Promise<string> {
  const fallback = "xl/worksheets/sheet1.xml";
  const workbook = await readText(zip, "xl/workbook.xml");
  const rels = await readText(zip, "xl/_rels/workbook.xml.rels");
  if (!workbook || !rels) return fallback;
  const wb = cheerio.load(workbook, { xml: true });
  const rid = wb("sheet").first().attr("r:id");
  if (!rid) return fallback;
  const rl = cheerio.load(rels, { xml: true });
  const target = rl("Relationship")
    .filter((_, el) => rl(el).attr("Id") === rid)
    .first()
    .attr("Target");
  if (!target) return fallback;
  return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
}

function cellText($: cheerio.CheerioAPI, cell: ReturnType<cheerio.CheerioAPI>, shared: string[]): string {
  const type = cell.attr("t");
  if (type === "inlineStr") return cell.find("is t").map((_, t) => $(t).text()).get().join("");
  const v = cell.children("v").first().text();
  if (type === "s") return shared[Number(v)] ?? "";
  if (type === "b") return v === "1" ? "TRUE" : "FALSE";
  return v; // 숫자·문자열 수식(str)·오류(e)는 저장된 값 그대로
}

export async function parseXlsxPreview(bytes: Uint8Array): Promise<XlsxPreview> {
  if (bytes.byteLength > PREVIEW_LIMITS.fileBytes) {
    throw new XlsxPreviewError("too_large", "결과 파일이 커서 미리보기를 만들 수 없습니다. 엑셀로 내려받아 확인해 주세요.");
  }
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw new XlsxPreviewError("not_xlsx", "결과 파일을 엑셀로 읽을 수 없습니다.");
  }

  const sheetXml = await readText(zip, await firstSheetPath(zip));
  if (sheetXml === null) throw new XlsxPreviewError("not_xlsx", "결과 파일에서 시트를 찾지 못했습니다.");

  const sharedXml = await readText(zip, "xl/sharedStrings.xml");
  const shared: string[] = [];
  if (sharedXml) {
    const s$ = cheerio.load(sharedXml, { xml: true });
    // 칸 하나가 여러 조각(<r><t>)으로 나뉘어도 이어 붙인다.
    s$("si").each((_, si) => {
      shared.push(s$(si).find("t").map((__, t) => s$(t).text()).get().join(""));
    });
  }

  const $ = cheerio.load(sheetXml, { xml: true });
  const rowEls = $("sheetData > row").toArray();
  let truncatedCols = false;
  const parsed: { n: number; cells: string[] }[] = [];
  let lastN = 0;
  for (const rowEl of rowEls) {
    const row = $(rowEl);
    const n = Number(row.attr("r")) || lastN + 1;
    lastN = n;
    // 머리글 + 보여 줄 행까지만 칸을 읽는다(나머지는 개수만 센다).
    if (n > PREVIEW_LIMITS.rows + 1) continue;
    const cells: string[] = [];
    let nextCol = 0;
    row.children("c").each((_, c) => {
      const cell = $(c);
      let idx = columnIndex(cell.attr("r"));
      if (idx < 0) idx = nextCol;
      nextCol = idx + 1;
      if (idx >= PREVIEW_LIMITS.cols) {
        truncatedCols = true;
        return;
      }
      while (cells.length < idx) cells.push("");
      cells[idx] = clip(cellText($, cell, shared));
    });
    parsed.push({ n, cells });
  }

  const headerRow = parsed.find((r) => r.n === 1)?.cells ?? [];
  const headers = headerRow.map((h, i) => h || `열 ${i + 1}`);
  const width = Math.min(Math.max(headers.length, ...parsed.map((r) => r.cells.length), 0), PREVIEW_LIMITS.cols);
  while (headers.length < width) headers.push(`열 ${headers.length + 1}`);

  const dataRowCount = rowEls.filter((el) => (Number($(el).attr("r")) || 0) !== 1).length;
  const rows = parsed
    .filter((r) => r.n >= 2)
    .sort((a, b) => a.n - b.n)
    .slice(0, PREVIEW_LIMITS.rows)
    .map((r) => Array.from({ length: width }, (_, i) => r.cells[i] ?? ""));

  return {
    headers,
    rows,
    totalRows: dataRowCount,
    truncatedRows: dataRowCount > rows.length,
    truncatedCols,
  };
}
