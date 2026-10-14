"use client";
import { useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { decodeText, splitByChars, splitBySentences, splitIntoParts, type Encoding } from "@/lib/files/text";
import { safeFileName, stem } from "@/lib/files/table";
import { downloadZip, readBytes } from "@/lib/files/download";
import { FileDrop, Messages } from "./Common";

type Mode = "chars" | "parts" | "sentences";

/** 텍스트 나누기: 글자 수(문단·문장 경계 보존) / 조각 수 / 문장 수 기준 → ZIP */
export function TextSplit() {
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [enc, setEnc] = useState<Encoding>("auto");
  const [mode, setMode] = useState<Mode>("chars");
  const [size, setSize] = useState(2000);
  const [parts, setParts] = useState(3);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function pick(files: File[]) {
    setError(""); setNotice("");
    const f = files[0];
    if (!f || !(/\.(txt|md|log|csv)$/i.test(f.name) || f.type.startsWith("text/"))) { setError("텍스트(.txt·.md·.log) 파일 하나를 골라 주세요."); return; }
    setFile(f); setBytes(await readBytes(f));
  }
  const decoded = useMemo(() => (bytes ? decodeText(bytes, enc) : null), [bytes, enc]);
  const pieces = useMemo(() => {
    if (!decoded) return [];
    const t = decoded.text;
    return mode === "chars" ? splitByChars(t, size) : mode === "parts" ? splitIntoParts(t, parts) : splitBySentences(t, parts);
  }, [decoded, mode, size, parts]);

  function save() {
    setError(""); setNotice("");
    if (!file || !pieces.length) { setError("나눌 파일을 먼저 골라 주세요."); return; }
    if (pieces.length > 1000) { setError(`조각이 ${pieces.length}개로 너무 많습니다(최대 1000개). 기준을 키워 주세요.`); return; }
    const base = safeFileName(stem(file.name));
    const w = Math.max(2, String(pieces.length).length);
    const enc8 = new TextEncoder();
    downloadZip(pieces.map((p, i) => ({ name: `${base}_${String(i + 1).padStart(w, "0")}.txt`, data: enc8.encode(p) })), `${base}_나누기.zip`);
    setNotice(`${pieces.length}개 파일로 나눠 ZIP으로 저장했습니다(UTF-8).`);
  }

  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        <FileDrop accept=".txt,.md,.log,text/plain" multiple={false} hint="나눌 텍스트 파일 하나. 메모장 ANSI(한글)·UTF-8을 자동으로 알아봅니다." onFiles={pick} />
        {file && decoded && <p className="fm-summary"><FileText size={15} /> {file.name} — {decoded.text.length.toLocaleString()}자 · {decoded.encoding === "euc-kr" ? "한국어 ANSI" : "UTF-8"}</p>}
      </section>

      <section className="card fm-step">
        <h2><span>2</span>나누는 기준</h2>
        <div className="chips">
          <button type="button" className={`chip${mode === "chars" ? " on" : ""}`} aria-pressed={mode === "chars"} onClick={() => setMode("chars")}>글자 수</button>
          <button type="button" className={`chip${mode === "parts" ? " on" : ""}`} aria-pressed={mode === "parts"} onClick={() => setMode("parts")}>조각 수(길이 고르게)</button>
          <button type="button" className={`chip${mode === "sentences" ? " on" : ""}`} aria-pressed={mode === "sentences"} onClick={() => setMode("sentences")}>문장 수 고르게</button>
        </div>
        <small className="muted">{mode === "chars" ? "한 조각이 정한 글자 수를 넘지 않게 나눕니다. 가능하면 문단 → 줄 → 문장 → 띄어쓰기 자리에서 자릅니다." : mode === "parts" ? "전체 길이를 조각 수만큼 비슷하게 나눕니다(경계를 지키느라 조각 수가 1개 다를 수 있음)." : "문장 개수를 조각마다 고르게 나눕니다."}</small>
        <div className="fm-opts">
          {mode === "chars"
            ? <label>조각당 최대 글자 수<input type="number" min={50} max={1000000} value={size} onChange={(e) => setSize(Math.max(50, Number(e.target.value) || 50))} /></label>
            : <label>조각 수<input type="number" min={1} max={1000} value={parts} onChange={(e) => setParts(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))} /></label>}
          <label>글자 인코딩
            <select value={enc} onChange={(e) => setEnc(e.target.value as Encoding)}>
              <option value="auto">자동 인식</option><option value="utf-8">UTF-8</option><option value="euc-kr">한국어 ANSI(CP949)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card fm-step">
        <h2><span>3</span>미리보기</h2>
        {!pieces.length ? <p className="muted">파일을 고르면 나뉜 조각이 여기에 보입니다.</p> : (
          <>
            <p className="fm-summary">결과 <b>{pieces.length}</b>개 조각</p>
            <ol className="fm-pieces">
              {pieces.slice(0, 50).map((p, i) => (
                <li key={i}><b>{i + 1}</b><small className="muted">{p.length.toLocaleString()}자</small><span>{p.slice(0, 80).replace(/\n/g, " ⏎ ")}{p.length > 80 ? "…" : ""}</span></li>
              ))}
            </ol>
            {pieces.length > 50 && <small className="muted">앞 50개만 보여 줍니다.</small>}
          </>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <Messages error={error} notice={notice} />
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={!pieces.length}><Download size={15} />나눠서 ZIP으로 저장</button></div>
      </section>
    </div>
  );
}
