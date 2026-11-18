import "server-only";
import JSZip from "jszip";
import * as cheerio from "cheerio";

// 완료된 수집 엑셀(service/pipeline.py → scripts/export_excel.py, 시트 1개·1행 머리글)을 화면 표로 미리 보여 주기 위한 해석기.
// 2026-11-18 T-07. 이미 쓰는 jszip·cheerio만 사용(새 의존성 0). 수식 계산·서식은 보지 않고 값만 읽는다.
//
// 크기 보호(F01, 맥미니 QA 2026-11-18): zip이 적어 둔 "풀린 크기"는 거짓일 수 있으므로 믿지 않는다.
// 읽는 파일(workbook·rels·sharedStrings·sheet)을 jszip internalStream으로 조각마다 풀면서 **실제로 풀린 바이트를 모두 합산**하고,
// 합이 16MiB를 넘는 순간 그 흐름을 멈추고 too_large로 끝낸다(글자 수가 아니라 바이트 기준).
// 문서 해석(DOM)은 시트 앞 21행(머리글+20행)만, 공유 문자열은 그 행이 쓰는 번호만 꺼낸다.

export const PREVIEW_LIMITS = {
  rows: 20, // 화면에 보여 줄 데이터 행
  cols: 30, // 화면에 보여 줄 열
  cellChars: 300, // 한 칸 글자 수(넘으면 자르고 "…")
  fileBytes: 10 * 1024 * 1024, // 내려받은 엑셀(압축) 파일 크기 상한
  xmlBytes: 16 * 1024 * 1024, // 읽는 XML 4개를 실제로 풀었을 때 바이트 합 상한(압축 폭탄 방지)
  // 해석할 앞 21행 안의 셀 수 상한. 21행 × 1,000열 — 정상 결과(수집 항목 수십 개)보다 넉넉하고, 한 행에 셀을 몰아넣은 파일의 DOM 폭주는 막는다.
  previewCells: 21 * 1000,
} as const;

const TOO_LARGE_MSG = "결과 파일이 커서 미리보기를 만들 수 없습니다. 엑셀로 내려받아 확인해 주세요.";

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

const tooLarge = () => new XlsxPreviewError("too_large", TOO_LARGE_MSG);
const notXlsx = (message = "결과 파일을 엑셀로 읽을 수 없습니다.") => new XlsxPreviewError("not_xlsx", message);

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

type Budget = { left: number };
type StreamHelper = {
  on(event: "data", fn: (chunk: Uint8Array) => void): StreamHelper;
  on(event: "error", fn: (err: unknown) => void): StreamHelper;
  on(event: "end", fn: () => void): StreamHelper;
  pause(): StreamHelper;
  resume(): StreamHelper;
};

/** 파일 하나를 조각으로 풀며 실제 바이트를 budget에서 뺀다. 넘으면 즉시 멈추고 too_large. */
async function readBounded(zip: JSZip, path: string, budget: Budget): Promise<string | null> {
  const file = zip.file(path);
  if (!file) return null;
  const stream = (file as unknown as { internalStream(type: "uint8array"): StreamHelper }).internalStream("uint8array");
  const chunks: Uint8Array[] = [];
  let total = 0;
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    stream
      .on("data", (chunk) => {
        if (settled) return;
        budget.left -= chunk.byteLength;
        if (budget.left < 0) {
          settled = true;
          stream.pause(); // 더 풀지 않는다
          chunks.length = 0;
          reject(tooLarge());
          return;
        }
        chunks.push(chunk);
        total += chunk.byteLength;
      })
      .on("error", () => {
        if (settled) return;
        settled = true;
        reject(notXlsx());
      })
      .on("end", () => {
        if (settled) return;
        settled = true;
        resolve();
      })
      .resume();
  });
  const buf = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(buf);
}

/** workbook.xml의 첫 시트 → 관계 파일 → 실제 시트 경로. 못 찾으면 기본 경로. */
async function firstSheetPath(zip: JSZip, budget: Budget): Promise<string> {
  const fallback = "xl/worksheets/sheet1.xml";
  const workbook = await readBounded(zip, "xl/workbook.xml", budget);
  const rels = await readBounded(zip, "xl/_rels/workbook.xml.rels", budget);
  if (!workbook || !rels) return fallback;
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  if (!rid) return fallback;
  for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const tag = m[0];
    if (/\bId="([^"]+)"/.exec(tag)?.[1] !== rid) continue;
    const target = /\bTarget="([^"]+)"/.exec(tag)?.[1];
    if (!target) return fallback;
    return target.startsWith("/") ? target.slice(1) : `xl/${target}`;
  }
  return fallback;
}

/** 시트 XML에서 앞 keep개 <row>까지만 남긴 작은 XML과 전체 행 수(머리글 포함)를 돌려준다. */
function sliceSheet(sheetXml: string, keep: number): { head: string; rowCount: number } {
  const rowStart = /<row[\s>]/g;
  let rowCount = 0;
  let cut = -1;
  for (let m = rowStart.exec(sheetXml); m; m = rowStart.exec(sheetXml)) {
    if (rowCount === keep) cut = m.index;
    rowCount++;
  }
  const dataStart = sheetXml.indexOf("<sheetData");
  if (dataStart < 0) return { head: "<sheetData></sheetData>", rowCount: 0 };
  const end = cut >= 0 ? cut : sheetXml.indexOf("</sheetData>", dataStart);
  const head = `${sheetXml.slice(dataStart, end < 0 ? sheetXml.length : end)}</sheetData>`;
  return { head, rowCount };
}

/** sharedStrings.xml에서 필요한 번호만 꺼낸다(전체를 DOM으로 만들지 않음). 칸이 여러 조각(<r><t>)이어도 이어 붙인다. */
function pickSharedStrings(xml: string, wanted: Set<number>): Map<number, string> {
  const out = new Map<number, string>();
  if (wanted.size === 0) return out;
  const max = Math.max(...wanted);
  const si = /<si\b[^>]*?(?:\/>|>([\s\S]*?)<\/si>)/g;
  let index = 0;
  for (let m = si.exec(xml); m && index <= max; m = si.exec(xml), index++) {
    if (!wanted.has(index)) continue;
    const $ = cheerio.load(`<si>${m[1] ?? ""}</si>`, { xml: true });
    out.set(index, $("t").map((_, t) => $(t).text()).get().join(""));
  }
  return out;
}

export async function parseXlsxPreview(bytes: Uint8Array): Promise<XlsxPreview> {
  if (bytes.byteLength > PREVIEW_LIMITS.fileBytes) throw tooLarge();
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(bytes);
  } catch {
    throw notXlsx();
  }
  const budget: Budget = { left: PREVIEW_LIMITS.xmlBytes };

  const sheetXml = await readBounded(zip, await firstSheetPath(zip, budget), budget);
  if (sheetXml === null) throw notXlsx("결과 파일에서 시트를 찾지 못했습니다.");

  const { head, rowCount } = sliceSheet(sheetXml, PREVIEW_LIMITS.rows + 1);
  const cellCount = head.match(/<c[\s>/]/g)?.length ?? 0;
  if (cellCount > PREVIEW_LIMITS.previewCells) throw tooLarge();

  const $ = cheerio.load(head, { xml: true });
  type RawCell = { idx: number; type?: string; v: string; inline: string };
  const parsed: { n: number; cells: RawCell[] }[] = [];
  const wanted = new Set<number>();
  let truncatedCols = false;
  let lastN = 0;
  $("sheetData > row").each((_, rowEl) => {
    const row = $(rowEl);
    const n = Number(row.attr("r")) || lastN + 1;
    lastN = n;
    const cells: RawCell[] = [];
    let nextCol = 0;
    row.children("c").each((__, c) => {
      const cell = $(c);
      let idx = columnIndex(cell.attr("r"));
      if (idx < 0) idx = nextCol;
      nextCol = idx + 1;
      if (idx >= PREVIEW_LIMITS.cols) {
        truncatedCols = true;
        return;
      }
      const type = cell.attr("t");
      const v = cell.children("v").first().text();
      const inline = type === "inlineStr" ? cell.find("is t").map((___, t) => $(t).text()).get().join("") : "";
      if (type === "s" && /^\d+$/.test(v)) wanted.add(Number(v));
      cells.push({ idx, type, v, inline });
    });
    parsed.push({ n, cells });
  });

  const sharedXml = wanted.size > 0 ? await readBounded(zip, "xl/sharedStrings.xml", budget) : null;
  const shared = sharedXml ? pickSharedStrings(sharedXml, wanted) : new Map<number, string>();

  const textOf = (c: RawCell): string => {
    if (c.type === "inlineStr") return c.inline;
    if (c.type === "s") return shared.get(Number(c.v)) ?? "";
    if (c.type === "b") return c.v === "1" ? "TRUE" : "FALSE";
    return c.v; // 숫자·문자열 수식(str)·오류(e)는 저장된 값 그대로
  };
  const toRow = (cells: RawCell[]) => {
    const out: string[] = [];
    for (const c of cells) {
      while (out.length < c.idx) out.push("");
      out[c.idx] = clip(textOf(c));
    }
    return out;
  };

  const headerRow = toRow(parsed.find((r) => r.n === 1)?.cells ?? []);
  const dataRows = parsed.filter((r) => r.n >= 2).sort((a, b) => a.n - b.n).slice(0, PREVIEW_LIMITS.rows).map((r) => toRow(r.cells));
  const headers = headerRow.map((h, i) => h || `열 ${i + 1}`);
  const width = Math.min(Math.max(headers.length, ...dataRows.map((r) => r.length), 0), PREVIEW_LIMITS.cols);
  while (headers.length < width) headers.push(`열 ${headers.length + 1}`);

  const hasHeader = parsed.some((r) => r.n === 1);
  const totalRows = Math.max(rowCount - (hasHeader ? 1 : 0), 0);
  const rows = dataRows.map((r) => Array.from({ length: width }, (_, i) => r[i] ?? ""));

  return { headers, rows, totalRows, truncatedRows: totalRows > rows.length, truncatedCols };
}
