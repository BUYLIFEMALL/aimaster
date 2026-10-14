"use client";
import { useEffect, useMemo, useState } from "react";
import { Download, Layers } from "lucide-react";
import { ACCEPT_SHEETS, isCsv } from "@/lib/files/sheetio";
import { collectWrite, dropFile, loadFile, mergePreview, mergeWrite } from "@/lib/files/sheetClient";
import type { Pick, SheetMeta } from "@/lib/files/sheetStore";
import { safeFileName, type Cell } from "@/lib/files/table";
import type { Encoding } from "@/lib/files/text";
import { CSV_MIME, XLSX_MIME, downloadBytes } from "@/lib/files/download";
import { FileDrop, FileList, Messages, NameInput, PreviewTable, newId } from "./Common";

interface Item { id: string; file: File; sheets: SheetMeta[]; picked: boolean[] }
type Mode = "align" | "sheets";
interface Preview { header: string[]; rows: Cell[][]; total: number; collect: { name: string; rows: number }[] }

/**
 * 엑셀 합치기: 머리글 이름 기준으로 이어 붙이기(열 순서가 달라도 맞춤) 또는 시트별로 모으기.
 * 원본 데이터는 백그라운드 작업(Worker)에만 두고 화면은 미리보기 20행과 행·열 수만 받는다(v1.02 — 큰 파일에서 화면 멈춤 방지).
 */
export function ExcelMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<Mode>("align");
  const [headerRow, setHeaderRow] = useState(1);
  const [addSource, setAddSource] = useState(true);
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [enc, setEnc] = useState<Encoding>("auto");
  const [name, setName] = useState("합친_결과");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function add(files: File[]) {
    setError(""); setNotice("");
    const ok = files.filter((f) => /\.(xlsx|xls|xlsm|csv)$/i.test(f.name));
    if (ok.length < files.length) setError("엑셀(.xlsx·.xls·.xlsm)과 CSV 파일만 추가했습니다.");
    for (const [k, file] of ok.entries()) {
      setBusy(`읽는 중... (${k + 1}/${ok.length}) ${file.name}`);
      const id = newId();
      try {
        const sheets = await loadFile(id, file, enc);
        setItems((cur) => [...cur, { id, file, sheets, picked: sheets.map((s) => s.rows > 0) }]);
      } catch { setError(`${file.name}을(를) 읽지 못했습니다. 암호가 걸렸거나 손상된 파일인지 확인해 주세요.`); }
    }
    setBusy("");
  }
  function changeItems(next: Item[]) {
    items.filter((it) => !next.some((n) => n.id === it.id)).forEach((it) => { dropFile(it.id).catch(() => undefined); });
    setItems(next);
  }
  /** CSV 글자 인코딩을 바꾸면 CSV 파일만 다시 읽는다 */
  async function changeEnc(e: Encoding) {
    setEnc(e); setBusy("CSV를 다시 읽는 중...");
    try {
      const next = await Promise.all(items.map(async (it) => (isCsv(it.file.name) ? { ...it, sheets: await loadFile(it.id, it.file, e) } : it)));
      setItems(next);
    } catch { setError("CSV를 다시 읽지 못했습니다."); }
    finally { setBusy(""); }
  }
  const togglePick = (id: string, i: number) => setItems((cur) => cur.map((it) => (it.id === id ? { ...it, picked: it.picked.map((p, k) => (k === i ? !p : p)) } : it)));

  const picks: Pick[] = useMemo(() => items.flatMap((it) => it.sheets.map((_, i) => i).filter((i) => it.picked[i]).map((sheet) => ({ fileId: it.id, fileName: it.file.name, sheet }))), [items]);

  // 미리보기는 백그라운드에서 계산해 받아온다(옵션을 바꿀 때마다 다시)
  useEffect(() => {
    if (!picks.length) { setPreview(null); return; }
    let alive = true;
    mergePreview(picks, headerRow, addSource).then((p) => { if (alive) setPreview(p); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다."); });
    return () => { alive = false; };
  }, [picks, headerRow, addSource]);

  async function save() {
    setError(""); setNotice("");
    if (!picks.length) { setError("합칠 시트를 하나 이상 골라 주세요."); return; }
    const base = safeFileName(name) || "합친_결과";
    setBusy("파일을 만드는 중... 큰 파일은 수 초 걸릴 수 있습니다.");
    try {
      if (mode === "align") {
        const r = await mergeWrite(picks, headerRow, addSource, format);
        downloadBytes(r.bytes, `${base}.${format}`, format === "csv" ? CSV_MIME : XLSX_MIME);
        setNotice(`${picks.length}개 시트를 ${r.rows.toLocaleString()}행 · ${r.cols}열로 합쳐 저장했습니다.`);
      } else {
        const r = await collectWrite(picks);
        downloadBytes(r.bytes, `${base}.xlsx`, XLSX_MIME);
        setNotice(`${picks.length}개 시트를 한 파일에 모아 저장했습니다.`);
      }
    } catch (e) { setError(`저장하지 못했습니다: ${e instanceof Error ? e.message : "알 수 없는 오류"}`); }
    finally { setBusy(""); }
  }

  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        {busy && <p role="status" className="notice fm-busy">{busy}</p>}
        <FileDrop accept={ACCEPT_SHEETS} multiple hint="엑셀(.xlsx·.xls·.xlsm)과 CSV를 여러 개 고를 수 있습니다. 파일은 서버로 보내지 않고 이 브라우저에서만 처리합니다." onFiles={add} />
        {items.length > 0 && (
          <FileList items={items} onChange={changeItems} render={(it) => (
            <div className="fm-sheets">
              {it.sheets.map((s, i) => (
                <label key={i} className="fm-check">
                  <input type="checkbox" checked={it.picked[i]} onChange={() => togglePick(it.id, i)} />
                  {s.name || "CSV"} <small className="muted">{s.rows.toLocaleString()}행</small>
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
        {!picks.length ? <p className="muted">파일을 올리고 합칠 시트를 고르면 결과가 여기에 보입니다.</p>
          : !preview ? <p className="muted" role="status">미리보기를 만드는 중...</p>
          : mode === "align" ? (
            <>
              <p className="fm-summary"><b>{picks.length}</b>개 시트 → <b>{preview.total.toLocaleString()}</b>행 · <b>{preview.header.length}</b>열</p>
              <PreviewTable header={preview.header} rows={preview.rows} total={preview.total} />
            </>
          ) : (
            <ul className="fm-outs">{preview.collect.map((c, i) => <li key={i}><Layers size={14} />{c.name} <small className="muted">{c.rows.toLocaleString()}행</small></li>)}</ul>
          )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <NameInput value={name} onChange={setName} ext={mode === "align" && format === "csv" ? ".csv" : ".xlsx"} />
        <Messages error={error} notice={notice} />
        {busy && <p role="status" className="notice fm-busy">{busy}</p>}
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={!picks.length || !!busy}><Download size={15} />{busy ? "처리 중..." : "합쳐서 저장"}</button></div>
      </section>
    </div>
  );
}
