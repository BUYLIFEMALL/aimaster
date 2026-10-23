"use client";
import { useEffect, useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";
import { ACCEPT_SHEETS } from "@/lib/files/sheetio";
import { dropFile, loadFile, splitPlan, splitWrite } from "@/lib/files/sheetClient";
import { MAX_SPLIT_FILES, type SheetMeta, type SplitMode } from "@/lib/files/sheetStore";
import { safeFileName, stem } from "@/lib/files/table";
import { downloadBytes } from "@/lib/files/download";
import { FileDrop, Messages, newId } from "./Common";
import { canStyle } from "@/lib/files/styled";

/** 엑셀 나누기: 시트별 / 특정 열 값별 / N행씩 → 파일 여러 개를 ZIP 하나로. 처리는 백그라운드(Worker)에서(v1.02) */
export function ExcelSplit() {
  const [file, setFile] = useState<{ id: string; file: File } | null>(null);
  const [sheets, setSheets] = useState<SheetMeta[]>([]);
  const [mode, setMode] = useState<SplitMode>("sheets");
  const [sheetIdx, setSheetIdx] = useState(0);
  const [headerRow, setHeaderRow] = useState(1);
  const [col, setCol] = useState(0);
  const [rowsPer, setRowsPer] = useState(1000);
  const [plan, setPlan] = useState<{ header: string[]; outs: { name: string; rows: number }[] } | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  // 원본 서식 유지(v1.05) — .xlsx·.xlsm만. 켰을 때만 원본 바이트를 다시 읽어 보낸다
  const [keepStyle, setKeepStyle] = useState(false);
  const stylable = !!file && canStyle(file.file.name);

  async function pick(files: File[]) {
    setError(""); setNotice("");
    const f = files[0];
    if (!f || !/\.(xlsx|xls|xlsm|csv)$/i.test(f.name)) { setError("엑셀(.xlsx·.xls·.xlsm) 또는 CSV 파일 하나를 골라 주세요."); return; }
    setBusy(`읽는 중... ${f.name}`);
    try {
      if (file) dropFile(file.id).catch(() => undefined);
      const id = newId();
      const s = await loadFile(id, f, "auto");
      setFile({ id, file: f }); setSheets(s); setSheetIdx(Math.max(0, s.findIndex((x) => x.rows > 0))); setCol(0);
      setMode(s.length > 1 ? "sheets" : "column");
    } catch { setError(`${f.name}을(를) 읽지 못했습니다. 암호가 걸렸거나 손상된 파일인지 확인해 주세요.`); }
    finally { setBusy(""); }
  }

  const opts = file ? { fileId: file.id, fileName: file.file.name, mode, sheet: sheetIdx, headerRow, col, rowsPer } : null;
  const optsKey = JSON.stringify(opts);
  useEffect(() => {
    if (!opts) { setPlan(null); return; }
    let alive = true;
    splitPlan(opts).then((p) => { if (alive) setPlan(p); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다."); });
    return () => { alive = false; };
    // opts는 매번 새 객체라 내용(optsKey)으로 비교한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optsKey]);

  async function save() {
    setError(""); setNotice("");
    if (!opts || !plan?.outs.length) { setError("나눌 파일을 먼저 골라 주세요."); return; }
    const styled = keepStyle && stylable;
    setBusy(`파일 ${plan.outs.length}개를 ${styled ? "서식을 유지해 " : ""}만드는 중... 큰 파일은 ${styled ? "시간이 더 걸립니다" : "수 초 걸릴 수 있습니다"}.`);
    try {
      const r = await splitWrite(opts, styled && file ? await file.file.arrayBuffer() : undefined);
      downloadBytes(r.bytes, `${safeFileName(stem(opts.fileName))}_나누기.zip`, "application/zip");
      setNotice(`${r.count}개 파일로 나눠 ZIP으로 저장했습니다.`);
    } catch (e) { setError(`저장하지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`); }
    finally { setBusy(""); }
  }

  const outs = plan?.outs ?? [];
  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        {busy && <p role="status" className="notice fm-busy">{busy}</p>}
        <FileDrop accept={ACCEPT_SHEETS} multiple={false} hint="나눌 엑셀(.xlsx·.xls·.xlsm) 또는 CSV 파일 하나. 이 브라우저에서만 처리합니다." onFiles={pick} />
        {file && <p className="fm-summary"><FileSpreadsheet size={15} /> {file.file.name} — 시트 {sheets.length}개</p>}
      </section>

      <section className="card fm-step">
        <h2><span>2</span>나누는 기준</h2>
        <div className="chips">
          <button type="button" className={`chip${mode === "sheets" ? " on" : ""}`} aria-pressed={mode === "sheets"} onClick={() => setMode("sheets")}>시트별</button>
          <button type="button" className={`chip${mode === "column" ? " on" : ""}`} aria-pressed={mode === "column"} onClick={() => setMode("column")}>열 값별</button>
          <button type="button" className={`chip${mode === "rows" ? " on" : ""}`} aria-pressed={mode === "rows"} onClick={() => setMode("rows")}>N행씩</button>
        </div>
        <small className="muted">{mode === "sheets" ? `시트마다 파일 하나로 나눕니다${keepStyle && stylable ? "(원본 서식 그대로)" : "(서식 없이 값만)"}.` : mode === "column" ? "고른 열의 값(예: 지역)이 같은 행끼리 파일 하나로 나눕니다. 머리글은 파일마다 다시 넣습니다." : "정한 행 수씩 잘라 파일로 나눕니다. 머리글은 파일마다 다시 넣습니다."}</small>
        {stylable && <label className="fm-check"><input type="checkbox" checked={keepStyle} onChange={(e) => setKeepStyle(e.target.checked)} />원본 서식 유지(글꼴·색·테두리·표시 형식·열 너비 — 저장이 더 오래 걸림)</label>}
        {mode === "sheets" && sheets.length === 1 && <small className="muted">시트가 1개라 결과도 1개입니다. 열 값별·N행씩 나누기를 써 보세요.</small>}
        {mode !== "sheets" && sheets.length > 0 && (
          <div className="fm-opts">
            <label>시트
              <select value={sheetIdx} onChange={(e) => { setSheetIdx(Number(e.target.value)); setCol(0); }}>
                {sheets.map((s, i) => <option key={i} value={i}>{s.name || "CSV"} ({s.rows.toLocaleString()}행)</option>)}
              </select>
            </label>
            <label>머리글 행
              <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                <option value={0}>머리글 없음</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}행</option>)}
              </select>
            </label>
            {mode === "column" && plan && (
              <label>나눌 열
                <select value={col} onChange={(e) => setCol(Number(e.target.value))}>
                  {plan.header.map((h, i) => <option key={i} value={i}>{h}</option>)}
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
        {!file ? <p className="muted">파일을 고르면 만들어질 파일 목록이 여기에 보입니다.</p> : !plan ? <p className="muted" role="status">목록을 만드는 중...</p> : (
          <>
            <p className="fm-summary">결과 <b>{outs.length}</b>개 파일{outs.length > MAX_SPLIT_FILES ? ` — 최대 ${MAX_SPLIT_FILES}개까지 저장할 수 있어 기준을 바꿔야 합니다` : ""}</p>
            <ul className="fm-outs">
              {outs.slice(0, 50).map((o, i) => <li key={i}><FileSpreadsheet size={14} />{o.name} <small className="muted">{mode === "sheets" ? `${o.rows.toLocaleString()}행(머리글 포함)` : `${o.rows.toLocaleString()}행 + 머리글`}</small></li>)}
            </ul>
            {outs.length > 50 && <small className="muted">앞 50개만 보여 줍니다.</small>}
          </>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <Messages error={error} notice={notice} />
        {busy && <p role="status" className="notice fm-busy">{busy}</p>}
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={!outs.length || outs.length > MAX_SPLIT_FILES || !!busy}><Download size={15} />{busy ? "처리 중..." : "나눠서 ZIP으로 저장"}</button></div>
      </section>
    </div>
  );
}
