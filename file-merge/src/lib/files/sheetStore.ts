// 엑셀·CSV 원본 데이터 보관소와 작업 처리(v1.02). 백그라운드 작업(Worker) 안에서 돌고, Worker를 못 쓰는 브라우저에서는 화면에서 같은 코드가 돈다.
// 화면에는 미리보기 몇 행과 행·열 수만 돌려보내 큰 데이터를 주고받는 비용(화면 멈춤)을 없앤다.
import { readSheets, writeCsv, writeXlsx, writeXlsxAoa, type RawSheet } from "./sheetio";
import { mergeByHeader, safeFileName, safeSheetName, splitByColumn, splitByRows, stem, toTable, type Cell } from "./table";
import type { Encoding } from "./text";
import { createZip } from "./zip";

export interface SheetMeta { name: string; rows: number }
export interface Pick { fileId: string; fileName: string; sheet: number }
export type SplitMode = "sheets" | "column" | "rows";
export interface SplitOpts { fileId: string; fileName: string; mode: SplitMode; sheet: number; headerRow: number; col: number; rowsPer: number }

export type StoreJob =
  | { op: "load"; fileId: string; name: string; bytes: ArrayBuffer; enc: Encoding }
  | { op: "drop"; fileId: string }
  | { op: "mergePreview"; picks: Pick[]; headerRow: number; addSource: boolean; limit: number }
  | { op: "mergeWrite"; picks: Pick[]; headerRow: number; addSource: boolean; format: "xlsx" | "csv" }
  | { op: "collectWrite"; picks: Pick[] }
  | { op: "splitPlan"; opts: SplitOpts }
  | { op: "splitWrite"; opts: SplitOpts };

const files = new Map<string, { name: string; bytes: Uint8Array; sheets: RawSheet[] }>();

function sheetsOf(p: Pick): RawSheet {
  const f = files.get(p.fileId);
  if (!f || !f.sheets[p.sheet]) throw new Error("파일을 다시 올려 주세요(작업 데이터가 없습니다).");
  return f.sheets[p.sheet];
}

function merged(picks: Pick[], headerRow: number, addSource: boolean) {
  return mergeByHeader(picks.map((p) => { const s = sheetsOf(p); return toTable(p.fileName, s.name, s.aoa, headerRow); }), { addSource });
}

function collectNames(picks: Pick[]) {
  const used = new Set<string>();
  return picks.map((p) => { const s = sheetsOf(p); return { name: safeSheetName(s.name ? `${stem(p.fileName)}_${s.name}` : stem(p.fileName), used), aoa: s.aoa }; });
}

/** 나누기 결과 목록(이름·행 수)과 각 결과를 만드는 함수 */
function splitOuts(o: SplitOpts): { header: string[]; outs: { name: string; rows: number; make: () => Uint8Array }[] } {
  const f = files.get(o.fileId);
  if (!f) throw new Error("파일을 다시 올려 주세요(작업 데이터가 없습니다).");
  const base = stem(o.fileName);
  const used = new Set<string>();
  const fname = (k: string) => `${safeFileName(`${base}_${k}`, used)}.xlsx`;
  if (o.mode === "sheets") {
    return { header: [], outs: f.sheets.map((s) => ({ name: fname(s.name || "시트"), rows: s.aoa.length, make: () => writeXlsxAoa([{ name: safeSheetName(s.name || "Sheet1", new Set()), aoa: s.aoa }]) })) };
  }
  const s = f.sheets[o.sheet];
  if (!s) throw new Error("시트를 찾을 수 없습니다.");
  const t = toTable(o.fileName, s.name, s.aoa, o.headerRow);
  const sheetName = safeSheetName(s.name || "Sheet1", new Set());
  const one = (rows: Cell[][]) => () => writeXlsx([{ name: sheetName, header: t.header, rows }]);
  if (o.mode === "column") return { header: t.header, outs: splitByColumn(t, o.col).map((g) => ({ name: fname(g.key), rows: g.rows.length, make: one(g.rows) })) };
  const chunks = splitByRows(t.rows, o.rowsPer);
  const w = Math.max(2, String(chunks.length).length);
  return { header: t.header, outs: chunks.map((rows, i) => ({ name: fname(String(i + 1).padStart(w, "0")), rows: rows.length, make: one(rows) })) };
}

export const MAX_SPLIT_FILES = 500;

/** 작업 하나를 처리한다. 돌려주는 값은 작게(미리보기·목록·결과 바이트) 유지한다 */
export function handle(job: StoreJob): unknown {
  switch (job.op) {
    case "load": {
      const bytes = new Uint8Array(job.bytes);
      const sheets = readSheets(bytes, job.name, job.enc);
      files.set(job.fileId, { name: job.name, bytes, sheets });
      return sheets.map((s): SheetMeta => ({ name: s.name, rows: s.aoa.length }));
    }
    case "drop": files.delete(job.fileId); return true;
    case "mergePreview": {
      const m = merged(job.picks, job.headerRow, job.addSource);
      return { header: m.header, rows: m.rows.slice(0, job.limit), total: m.rows.length, collect: collectNames(job.picks).map((c) => ({ name: c.name, rows: c.aoa.length })) };
    }
    case "mergeWrite": {
      const m = merged(job.picks, job.headerRow, job.addSource);
      return { bytes: job.format === "csv" ? writeCsv(m.header, m.rows) : writeXlsx([{ name: "합친 결과", header: m.header, rows: m.rows }]), rows: m.rows.length, cols: m.header.length };
    }
    case "collectWrite": return { bytes: writeXlsxAoa(collectNames(job.picks)) };
    case "splitPlan": { const r = splitOuts(job.opts); return { header: r.header, outs: r.outs.map((o) => ({ name: o.name, rows: o.rows })) }; }
    case "splitWrite": {
      const r = splitOuts(job.opts);
      if (r.outs.length > MAX_SPLIT_FILES) throw new Error(`결과 파일이 ${r.outs.length}개로 너무 많습니다(최대 ${MAX_SPLIT_FILES}개). 기준을 바꿔 주세요.`);
      return { bytes: createZip(r.outs.map((o) => ({ name: o.name, data: o.make() }))), count: r.outs.length };
    }
  }
}

