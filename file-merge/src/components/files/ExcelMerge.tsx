"use client";
import { useMemo, useState } from "react";
import { Download, Layers } from "lucide-react";
import { ACCEPT_SHEETS, isCsv, readSheets, writeCsv, writeXlsx, writeXlsxAoa, type RawSheet } from "@/lib/files/sheetio";
import { mergeByHeader, safeFileName, safeSheetName, stem, toTable } from "@/lib/files/table";
import type { Encoding } from "@/lib/files/text";
import { CSV_MIME, XLSX_MIME, downloadBytes, readBytes } from "@/lib/files/download";
import { FileDrop, FileList, Messages, NameInput, PreviewTable, newId } from "./Common";

interface Item { id: string; file: File; bytes: Uint8Array; sheets: RawSheet[]; picked: boolean[] }
type Mode = "align" | "sheets";

/** 엑셀 합치기: 머리글 이름 기준으로 이어 붙이기(열 순서가 달라도 맞춤) 또는 시트별로 모으기 */
export function ExcelMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("align");
  const [headerRow, setHeaderRow] = useState(1);
  const [addSource, setAddSource] = useState(true);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [enc, setEnc] = useState<Encoding>("auto");
  const [name, setName] = useState("합친_결과");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function add(files: File[]) {
    setError(""); setNotice("");
    const ok = files.filter((f) => /\.(xlsx|xls|xlsm|csv)$/i.test(f.name));
    if (ok.length < files.length) setError("엑셀(.xlsx·.xls·.xlsm)과 CSV 파일만 추가했습니다.");
    const next: Item[] = [];
    for (const file of ok) {
      try {
        const bytes = await readBytes(file);
        const sheets = readSheets(bytes, file.name, enc);
        next.push({ id: newId(), file, bytes, sheets, picked: sheets.map((s) => s.aoa.length > 0) });
      } catch { setError(`${file.name}을(를) 읽지 못했습니다. 암호가 걸렸거나 손상된 파일인지 확인해 주세요.`); }
    }
    setItems((cur) => [...cur, ...next]);
  }
  /** CSV 문자 인코딩을 바꾸면 CSV 파일만 다시 읽는다 */
  function changeEnc(e: Encoding) {
    setEnc(e);
    setItems((cur) => cur.map((it) => (isCsv(it.file.name) ? { ...it, sheets: readSheets(it.bytes, it.file.name, e) } : it)));
  }
  const togglePick = (id: string, i: number) => setItems((cur) => cur.map((it) => (it.id === id ? { ...it, picked: it.picked.map((p, k) => (k === i ? !p : p)) } : it)));

  const picked = useMemo(() => items.flatMap((it) => it.sheets.filter((_, i) => it.picked[i]).map((s) => ({ file: it.file.name, sheet: s }))), [items]);
  const merged = useMemo(() => (mode === "align" && picked.length
    ? mergeByHeader(picked.map((p) => toTable(p.file, p.sheet.name, p.sheet.aoa, headerRow)), { addSource })
    : null), [mode, picked, headerRow, addSource]);
  const collected = useMemo(() => {
    const used = new Set<string>();
    return picked.map((p) => ({ name: safeSheetName(p.sheet.name ? `${stem(p.file)}_${p.sheet.name}` : stem(p.file), used), aoa: p.sheet.aoa }));
  }, [picked]);

  function save() {
    setError(""); setNotice("");
    if (!picked.length) { setError("합칠 시트를 하나 이상 골라 주세요."); return; }
    const base = safeFileName(name) || "합친_결과";
    try {
      if (mode === "align" && merged) {
        if (format === "csv") downloadBytes(writeCsv(merged.header, merged.rows), `${base}.csv`, CSV_MIME);
        else downloadBytes(writeXlsx([{ name: "합친 결과", header: merged.header, rows: merged.rows }]), `${base}.xlsx`, XLSX_MIME);
        setNotice(`${picked.length}개 시트를 ${merged.rows.length.toLocaleString()}행 · ${merged.header.length}열로 합쳐 저장했습니다.`);
      } else {
        downloadBytes(writeXlsxAoa(collected), `${base}.xlsx`, XLSX_MIME);
        setNotice(`${collected.length}개 시트를 한 파일에 모아 저장했습니다.`);
      }
    } catch (e) { setError(`저장하지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`); }
  }

  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        <FileDrop accept={ACCEPT_SHEETS} multiple hint="엑셀(.xlsx·.xls·.xlsm)과 CSV를 여러 개 고를 수 있습니다. 파일은 서버로 보내지 않고 이 브라우저에서만 처리합니다." onFiles={add} />
        {items.length > 0 && (
          <FileList items={items} onChange={setItems} render={(it) => (
            <div className="fm-sheets">
              {it.sheets.map((s, i) => (
                <label key={i} className="fm-check">
                  <input type="checkbox" checked={it.picked[i]} onChange={() => togglePick(it.id, i)} />
                  {s.name || "CSV"} <small className="muted">{s.aoa.length.toLocaleString()}행</small>
                </label>
              ))}
            </div>
          )} />
        )}
      </section>

      <section className="card fm-step">
        <h2><span>2</span>합치는 방식</h2>
        <div className="chips">
          <button type="button" className={`chip${mode === "align" ? " on" : ""}`} aria-pressed={mode === "align"} onClick={() => setMode("align")}>머리글 기준으로 이어 붙이기</button>
          <button type="button" className={`chip${mode === "sheets" ? " on" : ""}`} aria-pressed={mode === "sheets"} onClick={() => setMode("sheets")}>시트별로 모으기</button>
        </div>
        <small className="muted">{mode === "align"
          ? "같은 이름의 열끼리 맞춰 한 표로 이어 붙입니다. 열 순서가 달라도, 한쪽에만 있는 열이 있어도 맞게 들어가고 머리글은 한 번만 넣습니다."
          : "고른 시트를 내용 그대로 한 파일의 여러 탭으로 모읍니다. 탭 이름은 '파일명_시트명'(31자 이내)입니다."}</small>
        {mode === "align" && (
          <div className="fm-opts">
            <label>머리글 행
              <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                <option value={0}>머리글 없음(열1·열2…)</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}행</option>)}
              </select>
            </label>
            <label className="fm-check"><input type="checkbox" checked={addSource} onChange={(e) => setAddSource(e.target.checked)} />맨 앞에 원본 파일·시트 열 넣기</label>
            <label>저장 형식
              <select value={format} onChange={(e) => setFormat(e.target.value as "xlsx" | "csv")}>
                <option value="xlsx">엑셀(.xlsx)</option><option value="csv">CSV(엑셀에서 한글 깨짐 없음)</option>
              </select>
            </label>
          </div>
        )}
        {items.some((it) => isCsv(it.file.name)) && (
          <label className="fm-inline">CSV 글자 인코딩
            <select value={enc} onChange={(e) => changeEnc(e.target.value as Encoding)}>
              <option value="auto">자동 인식</option><option value="utf-8">UTF-8</option><option value="euc-kr">한국어 ANSI(CP949)</option>
            </select>
          </label>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>3</span>미리보기</h2>
        {!picked.length ? <p className="muted">파일을 올리고 합칠 시트를 고르면 결과가 여기에 보입니다.</p>
          : mode === "align" && merged ? (
            <>
              <p className="fm-summary"><b>{picked.length}</b>개 시트 → <b>{merged.rows.length.toLocaleString()}</b>행 · <b>{merged.header.length}</b>열</p>
              <PreviewTable header={merged.header} rows={merged.rows} />
            </>
          ) : (
            <ul className="fm-outs">{collected.map((c, i) => <li key={i}><Layers size={14} />{c.name} <small className="muted">{c.aoa.length.toLocaleString()}행</small></li>)}</ul>
          )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <NameInput value={name} onChange={setName} ext={mode === "align" && format === "csv" ? ".csv" : ".xlsx"} />
        <Messages error={error} notice={notice} />
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={!picked.length}><Download size={15} />합쳐서 저장</button></div>
      </section>
    </div>
  );
}
