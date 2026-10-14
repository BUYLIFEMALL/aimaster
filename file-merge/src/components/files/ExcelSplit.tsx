"use client";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { ACCEPT_SHEETS, readSheets, writeXlsx, writeXlsxAoa, type RawSheet } from "@/lib/files/sheetio";
import { safeFileName, safeSheetName, splitByColumn, splitByRows, stem, toTable, type Cell } from "@/lib/files/table";
import type { Encoding } from "@/lib/files/text";
import { downloadZip, readBytes } from "@/lib/files/download";
import { FileDrop, Messages } from "./Common";

type Mode = "sheets" | "column" | "rows";
interface Out { name: string; rows: number; make: () => Uint8Array }

/** 엑셀 나누기: 시트별 / 특정 열 값별 / N행씩 → 파일 여러 개를 ZIP 하나로 */
export function ExcelSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<RawSheet[]>([]);
  const [mode, setMode] = useState<Mode>("sheets");
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [col, setCol] = useState(0);
  const [rowsPer, setRowsPer] = useState(1000);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function pick(files: File[]) {
    setError(""); setNotice("");
    const f = files[0];
    if (!f || !/\.(xlsx|xls|xlsm|csv)$/i.test(f.name)) { setError("엑셀(.xlsx·.xls·.xlsm) 또는 CSV 파일 하나를 골라 주세요."); return; }
    try {
      const s = readSheets(await readBytes(f), f.name, "auto" as Encoding);
      setFile(f); setSheets(s); setSheetIdx(Math.max(0, s.findIndex((x) => x.aoa.length > 0))); setCol(0);
      setMode(s.length > 1 ? "sheets" : "column");
    } catch { setError(`${f.name}을(를) 읽지 못했습니다. 암호가 걸렸거나 손상된 파일인지 확인해 주세요.`); }
  }

  const table = useMemo(() => (sheets[sheetIdx] ? toTable(file?.name ?? "", sheets[sheetIdx].name, sheets[sheetIdx].aoa, headerRow) : null), [sheets, sheetIdx, headerRow, file]);

  const outs: Out[] = useMemo(() => {
    if (!file) return [];
    const base = stem(file.name);
    const used = new Set<string>();
    const fname = (k: string) => `${safeFileName(`${base}_${k}`, used)}.xlsx`;
    if (mode === "sheets") {
      return sheets.map((s) => ({ name: fname(s.name || "시트"), rows: s.aoa.length, make: () => writeXlsxAoa([{ name: safeSheetName(s.name || "Sheet1", new Set()), aoa: s.aoa }]) }));
    }
    if (!table) return [];
    const sheetName = safeSheetName(sheets[sheetIdx]?.name || "Sheet1", new Set());
    const one = (rows: Cell[][]) => () => writeXlsx([{ name: sheetName, header: table.header, rows }]);
    if (mode === "column") return splitByColumn(table, col).map((g) => ({ name: fname(g.key), rows: g.rows.length, make: one(g.rows) }));
    const chunks = splitByRows(table.rows, rowsPer);
    const w = String(chunks.length).length < 2 ? 2 : String(chunks.length).length;
    return chunks.map((rows, i) => ({ name: fname(String(i + 1).padStart(w, "0")), rows: rows.length, make: one(rows) }));
  }, [file, sheets, mode, table, sheetIdx, col, rowsPer]);

  function save() {
    setError(""); setNotice("");
    if (!file || !outs.length) { setError("나눌 파일을 먼저 골라 주세요."); return; }
    if (outs.length > 500) { setError(`결과 파일이 ${outs.length}개로 너무 많습니다(최대 500개). 기준을 바꿔 주세요.`); return; }
    try {
      downloadZip(outs.map((o) => ({ name: o.name, data: o.make() })), `${safeFileName(stem(file.name))}_나누기.zip`);
      setNotice(`${outs.length}개 파일로 나눠 ZIP으로 저장했습니다.`);
    } catch (e) { setError(`저장하지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`); }
  }

  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        <FileDrop accept={ACCEPT_SHEETS} multiple={false} hint="나눌 엑셀(.xlsx·.xls·.xlsm) 또는 CSV 파일 하나. 이 브라우저에서만 처리합니다." onFiles={pick} />
        {file && <p className="fm-summary"><FileSpreadsheet size={15} /> {file.name} — 시트 {sheets.length}개</p>}
      </section>

      <section className="card fm-step">
        <h2><span>2</span>나누는 기준</h2>
        <div className="chips">
          <button type="button" className={`chip${mode === "sheets" ? " on" : ""}`} aria-pressed={mode === "sheets"} onClick={() => setMode("sheets")}>시트별</button>
          <button type="button" className={`chip${mode === "column" ? " on" : ""}`} aria-pressed={mode === "column"} onClick={() => setMode("column")}>열 값별</button>
          <button type="button" className={`chip${mode === "rows" ? " on" : ""}`} aria-pressed={mode === "rows"} onClick={() => setMode("rows")}>N행씩</button>
        </div>
        <small className="muted">{mode === "sheets" ? "시트마다 파일 하나로 나눕니다(서식 없이 값만)." : mode === "column" ? "고른 열의 값(예: 지역)이 같은 행끼리 파일 하나로 나눕니다. 머리글은 파일마다 다시 넣습니다." : "정한 행 수씩 잘라 파일로 나눕니다. 머리글은 파일마다 다시 넣습니다."}</small>
        {mode === "sheets" && sheets.length === 1 && <small className="muted">시트가 1개라 결과도 1개입니다. 열 값별·N행씩 나누기를 써 보세요.</small>}
        {mode !== "sheets" && sheets.length > 0 && (
          <div className="fm-opts">
            <label>시트
              <select value={sheetIdx} onChange={(e) => { setSheetIdx(Number(e.target.value)); setCol(0); }}>
                {sheets.map((s, i) => <option key={i} value={i}>{s.name || "CSV"} ({s.aoa.length}행)</option>)}
              </select>
            </label>
            <label>머리글 행
              <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                <option value={0}>머리글 없음</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}행</option>)}
              </select>
            </label>
            {mode === "column" && table && (
              <label>나눌 열
                <select value={col} onChange={(e) => setCol(Number(e.target.value))}>
                  {table.header.map((h, i) => <option key={i} value={i}>{h}</option>)}
                </select>
              </label>
            )}
            {mode === "rows" && (
              <label>파일당 행 수
                <input type="number" min={1} max={1000000} value={rowsPer} onChange={(e) => setRowsPer(Math.max(1, Number(e.target.value) || 1))} />
              </label>
            )}
          </div>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>3</span>미리보기</h2>
        {!outs.length ? <p className="muted">파일을 고르면 만들어질 파일 목록이 여기에 보입니다.</p> : (
          <>
            <p className="fm-summary">결과 <b>{outs.length}</b>개 파일</p>
            <ul className="fm-outs">
              {outs.slice(0, 50).map((o, i) => <li key={i}><FileSpreadsheet size={14} />{o.name} <small className="muted">{mode === "sheets" ? `${o.rows}행(머리글 포함)` : `${o.rows}행 + 머리글`}</small></li>)}
            </ul>
            {outs.length > 50 && <small className="muted">앞 50개만 보여 줍니다.</small>}
          </>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <Messages error={error} notice={notice} />
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={!outs.length}><Download size={15} />나눠서 ZIP으로 저장</button></div>
      </section>
    </div>
  );
}
