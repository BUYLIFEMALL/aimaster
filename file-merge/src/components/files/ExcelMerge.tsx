"use client";
import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, Layers } from "lucide-react";
import { ACCEPT_SHEETS, isCsv } from "@/lib/files/sheetio";
import { collectWrite, dropFile, loadFile, mergePreview, mergeWrite } from "@/lib/files/sheetClient";
import type { MergeShape, Pick, SheetMeta } from "@/lib/files/sheetStore";
import { safeFileName, type Cell } from "@/lib/files/table";
import type { Encoding } from "@/lib/files/text";
import { canStyle } from "@/lib/files/styled";
import { CSV_MIME, XLSX_MIME, downloadBytes } from "@/lib/files/download";
import { FileDrop, FileList, Messages, NameInput, PreviewTable, newId } from "./Common";

interface Item { id: string; file: File; sheets: SheetMeta[]; picked: boolean[] }
type Mode = "align" | "sheets";
interface Preview { allHeader: string[]; header: string[]; rows: Cell[][]; total: number; removed: number; collect: { name: string; rows: number }[] }
interface Col { name: string; on: boolean }

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
  // 결과 다듬기(v1.03): 열 고르기·순서, 같은 행 제거
  const [cols, setCols] = useState<Col[]>([]);
  const [dedupe, setDedupe] = useState(false);
  // 원본 서식(글꼴·색·테두리·표시 형식·열 너비) 유지(v1.04) — .xlsx·.xlsm만, 켰을 때만 원본 바이트를 다시 읽어 보낸다
  const [keepStyle, setKeepStyle] = useState(false);

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

  /** 기본값(전체 열·원래 순서)이면 null로 보내 계산을 줄인다 */
  const shape: MergeShape = useMemo(() => {
    const all = preview?.allHeader ?? [];
    const plain = cols.length === all.length && cols.every((c, i) => c.on && c.name === all[i]);
    return { cols: cols.length && !plain ? cols.filter((c) => c.on).map((c) => c.name) : null, dedupe };
  }, [cols, dedupe, preview?.allHeader]);

  // 미리보기는 백그라운드에서 계산해 받아온다(옵션을 바꿀 때마다 다시)
  useEffect(() => {
    if (!picks.length) { setPreview(null); return; }
    let alive = true;
    mergePreview(picks, headerRow, addSource, shape).then((p) => { if (alive) setPreview(p); }).catch((e) => { if (alive) setError(e instanceof Error ? e.message : "미리보기를 만들지 못했습니다."); });
    return () => { alive = false; };
  }, [picks, headerRow, addSource, shape]);

  // 파일·머리글이 바뀌면 열 목록을 맞춘다: 고른 순서·체크는 유지하고 새 열은 끝에 체크된 채로 붙인다
  const allKey = preview?.allHeader.join("\u0000") ?? "";
  useEffect(() => {
    const all = preview?.allHeader;
    if (!all) return;
    setCols((cur) => {
      const kept = cur.filter((c) => all.includes(c.name));
      return [...kept, ...all.filter((n) => !kept.some((c) => c.name === n)).map((name) => ({ name, on: true }))];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allKey]);
  const moveCol = (i: number, d: number) => setCols((cur) => { const j = i + d; if (j < 0 || j >= cur.length) return cur; const n = [...cur]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const toggleCol = (i: number) => setCols((cur) => cur.map((c, k) => (k === i ? { ...c, on: !c.on } : c)));
  const onCount = cols.filter((c) => c.on).length;

  async function save() {
    setError(""); setNotice("");
    if (!picks.length) { setError("합칠 시트를 하나 이상 골라 주세요."); return; }
    if (mode === "align" && cols.length && !onCount) { setError("남길 열을 하나 이상 골라 주세요."); return; }
    const base = safeFileName(name) || "합친_결과";
    setBusy(keepStyle ? "서식을 유지해 파일을 만드는 중... 큰 파일은 시간이 더 걸립니다." : "파일을 만드는 중... 큰 파일은 수 초 걸릴 수 있습니다.");
    try {
      const styled = keepStyle && (mode === "sheets" || format === "xlsx");
      const style = styled ? Object.fromEntries(await Promise.all(items.filter((it) => canStyle(it.file.name) && picks.some((p) => p.fileId === it.id)).map(async (it) => [it.id, await it.file.arrayBuffer()] as const))) : undefined;
      const plain = styled && style && Object.keys(style).length === 0 ? " (서식을 가져올 .xlsx 파일이 없어 값만 저장했습니다)" : "";
      if (mode === "align") {
        const r = await mergeWrite(picks, headerRow, addSource, shape, format, style && Object.keys(style).length ? style : undefined);
        downloadBytes(r.bytes, `${base}.${format}`, format === "csv" ? CSV_MIME : XLSX_MIME);
        setNotice(`${picks.length}개 시트를 ${r.rows.toLocaleString()}행 · ${r.cols}열로 합쳐 저장했습니다.${r.removed ? ` 같은 행 ${r.removed.toLocaleString()}개는 뺐습니다.` : ""}${plain}`);
      } else {
        const r = await collectWrite(picks, style && Object.keys(style).length ? style : undefined);
        downloadBytes(r.bytes, `${base}.xlsx`, XLSX_MIME);
        setNotice(`${picks.length}개 시트를 한 파일에 모아 저장했습니다.${plain}`);
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
        {(mode === "sheets" || format === "xlsx") && (
          <label className="fm-check"><input type="checkbox" checked={keepStyle} onChange={(e) => setKeepStyle(e.target.checked)} />원본 서식 유지(글꼴·색·테두리·표시 형식·열 너비, .xlsx·.xlsm만 — 저장이 더 오래 걸림)</label>
        )}
        {mode === "align" && (
          <div className="fm-opts">
            <label>머리글 행
              <select value={headerRow} onChange={(e) => setHeaderRow(Number(e.target.value))}>
                <option value={0}>머리글 없음(열1·열2…)</option>
                {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}행</option>)}
              </select>
            </label>
            <label className="fm-check"><input type="checkbox" checked={addSource} onChange={(e) => setAddSource(e.target.checked)} />맨 앞에 원본 파일·시트 열 넣기</label>
            <label className="fm-check"><input type="checkbox" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />같은 행 제거(남길 열의 값이 모두 같으면 처음 행만 남김)</label>
            <label>저장 형식
              <select value={format} onChange={(e) => setFormat(e.target.value as "xlsx" | "csv")}>
                <option value="xlsx">엑셀(.xlsx)</option><option value="csv">CSV(엑셀에서 한글 깨짐 없음)</option>
              </select>
            </label>
          </div>
        )}
        {mode === "align" && cols.length > 0 && (
          <div className="fm-cols">
            <p className="fm-cols-head"><b>남길 열과 순서</b> <small className="muted">{onCount}/{cols.length}열 · 체크를 끄면 빠지고, 화살표로 순서를 바꿉니다</small>
              <button type="button" className="chip" onClick={() => setCols((cur) => cur.map((c) => ({ ...c, on: true })))}>전체 선택</button>
              <button type="button" className="chip" onClick={() => setCols((preview?.allHeader ?? []).map((name) => ({ name, on: true })))}>처음 상태로</button>
            </p>
            <ol className="fm-col-list">
              {cols.map((c, i) => (
                <li key={c.name} className={c.on ? "" : "off"}>
                  <label className="fm-check"><input type="checkbox" checked={c.on} onChange={() => toggleCol(i)} />{c.name}</label>
                  <span className="fm-file-btns">
                    <button type="button" aria-label={`${c.name} 열 위로`} onClick={() => moveCol(i, -1)} disabled={i === 0}><ArrowUp size={14} /></button>
                    <button type="button" aria-label={`${c.name} 열 아래로`} onClick={() => moveCol(i, 1)} disabled={i === cols.length - 1}><ArrowDown size={14} /></button>
                  </span>
                </li>
              ))}
            </ol>
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
              <p className="fm-summary"><b>{picks.length}</b>개 시트 → <b>{preview.total.toLocaleString()}</b>행 · <b>{preview.header.length}</b>열{preview.removed > 0 && <> · 같은 행 <b>{preview.removed.toLocaleString()}</b>개 제거</>}</p>
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
