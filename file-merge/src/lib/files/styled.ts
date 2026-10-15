// 원본 서식 유지 저장(v1.04, ExcelJS). SheetJS 무료판은 셀 서식을 저장하지 못해서, "서식 유지"를 켰을 때만 이 경로를 쓴다.
// 값은 기존과 같이 SheetJS로 읽은 표를 쓰고, 서식(글꼴·채우기·테두리·맞춤·표시 형식)·열 너비만 원본 .xlsx에서 ExcelJS로 가져온다.
// 기준: 머리글 줄·열 너비 = 그 열이 처음 나온 파일, 데이터 행 = 각자 원래 파일의 셀 서식. .xls·CSV는 서식 없이 값만.
import type ExcelJSType from "exceljs";
import type { Cell } from "./table";

type Wb = ExcelJSType.Workbook;
type Ws = ExcelJSType.Worksheet;

let lib: typeof ExcelJSType | null = null;
async function excel(): Promise<typeof ExcelJSType> {
  if (!lib) { const m = await import("exceljs"); lib = (m.default ?? m) as typeof ExcelJSType; }
  return lib;
}

export const canStyle = (name: string) => /\.(xlsx|xlsm)$/i.test(name);

/** 원본 파일 바이트 → ExcelJS 통합문서(읽지 못하면 null — 그 파일만 서식 없이 저장) */
export async function loadStyleBooks(files: Record<string, ArrayBuffer>): Promise<Map<string, Wb | null>> {
  const E = await excel();
  const out = new Map<string, Wb | null>();
  for (const [id, bytes] of Object.entries(files)) {
    try { const wb = new E.Workbook(); await wb.xlsx.load(bytes); out.set(id, wb); } catch { out.set(id, null); }
  }
  return out;
}

/** 원본 셀 위치(1부터) */
export interface CellRef { ws: Ws; row: number; col: number }

const copyStyle = (s: Partial<ExcelJSType.Style>) => JSON.parse(JSON.stringify(s)) as Partial<ExcelJSType.Style>;
const DATE_FMT = "yyyy-mm-dd";

/**
 * 표 하나를 서식째 .xlsx로. headerFrom(c)·cellFrom(r, c)가 원본 셀 위치를 알려 주면 그 서식을 복사한다.
 * widthFrom(c)는 열 너비를 가져올 원본 위치.
 */
export async function writeStyledTable(o: {
  sheetName: string; header: string[]; rows: Cell[][];
  headerFrom: (c: number) => CellRef | null;
  cellFrom: (r: number, c: number) => CellRef | null;
}): Promise<Uint8Array> {
  const E = await excel();
  const wb = new E.Workbook();
  const ws = wb.addWorksheet(o.sheetName);
  const head = ws.addRow(o.header);
  o.header.forEach((_, c) => {
    const ref = o.headerFrom(c);
    if (!ref) { head.getCell(c + 1).font = { bold: true }; return; }
    head.getCell(c + 1).style = copyStyle(ref.ws.getCell(ref.row, ref.col).style);
    const w = ref.ws.getColumn(ref.col).width;
    if (w) ws.getColumn(c + 1).width = w;
  });
  o.rows.forEach((values, r) => {
    const row = ws.addRow(values.map((v) => (v === null ? null : v)));
    values.forEach((v, c) => {
      const ref = o.cellFrom(r, c);
      const cell = row.getCell(c + 1);
      if (ref) cell.style = copyStyle(ref.ws.getCell(ref.row, ref.col).style);
      if (v instanceof Date && !cell.numFmt) cell.numFmt = DATE_FMT;
    });
  });
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** 시트 여러 장을 원본 모양·서식 그대로 한 파일로(시트별로 모으기). 서식을 못 가져오는 시트는 값만 */
export async function writeStyledSheets(sheets: { name: string; src: Ws | null; aoa: Cell[][] }[]): Promise<Uint8Array> {
  const E = await excel();
  const wb = new E.Workbook();
  for (const s of sheets) {
    const ws = wb.addWorksheet(s.name);
    if (s.src) {
      // ExcelJS 시트 모델 복사(셀 값·서식·병합·열 너비·행 높이). 이름은 새 이름으로
      ws.model = { ...s.src.model, name: s.name, mergeCells: (s.src.model as unknown as { merges?: string[] }).merges } as typeof ws.model;
      ws.name = s.name;
    } else {
      for (const r of s.aoa) ws.addRow(r.map((v) => (v === null ? null : v)));
    }
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
