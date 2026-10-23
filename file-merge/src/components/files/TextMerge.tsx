"use client";
import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { decodeText, joinTexts, parseSeparator, type Encoding } from "@/lib/files/text";
import { safeFileName } from "@/lib/files/table";
import { TXT_MIME, downloadBytes, readBytes } from "@/lib/files/download";
import { FileDrop, FileList, Messages, NameInput, newId } from "./Common";

interface Item { id: string; file: File; bytes: Uint8Array; text: string; encoding: string }
const SEPARATORS = [
  { id: "blank", name: "빈 줄", value: "\n\n" },
  { id: "line", name: "구분선(---)", value: "\n\n---\n\n" },
  { id: "none", name: "바로 이어서", value: "\n" },
  { id: "custom", name: "직접 입력", value: "" },
];

/** 텍스트 합치기: 순서를 정해 구분자로 잇고, 필요하면 파일명 머리말을 넣는다. 글자 인코딩 자동 인식 */
export function TextMerge() {
  const [items, setItems] = useState<Item[]>([]);
  const [enc, setEnc] = useState<Encoding>("auto");
  const [sepId, setSepId] = useState("blank");
  const [custom, setCustom] = useState("\\n\\n=====\\n\\n");
  const [withName, setWithName] = useState(false);
  const [name, setName] = useState("합친_텍스트");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function add(files: File[]) {
    setError(""); setNotice("");
    const ok = files.filter((f) => /\.(txt|md|csv|log)$/i.test(f.name) || f.type.startsWith("text/"));
    if (ok.length < files.length) setError("텍스트(.txt·.md·.log·.csv) 파일만 추가했습니다.");
    const next = await Promise.all(ok.map(async (file) => { const bytes = await readBytes(file); const d = decodeText(bytes, enc); return { id: newId(), file, bytes, text: d.text, encoding: d.encoding }; }));
    setItems((cur) => [...cur, ...next]);
  }
  function changeEnc(e: Encoding) {
    setEnc(e);
    setItems((cur) => cur.map((it) => { const d = decodeText(it.bytes, e); return { ...it, text: d.text, encoding: d.encoding }; }));
  }
  const separator = sepId === "custom" ? parseSeparator(custom) : SEPARATORS.find((s) => s.id === sepId)?.value ?? "\n\n";
  const result = useMemo(() => joinTexts(items.map((it) => ({ name: it.file.name, text: it.text })), { separator, withName }), [items, separator, withName]);

  function save() {
    setError(""); setNotice("");
    if (items.length < 2) { setError("합칠 파일을 2개 이상 올려 주세요."); return; }
    downloadBytes(result, `${safeFileName(name) || "합친_텍스트"}.txt`, TXT_MIME);
    setNotice(`${items.length}개 파일을 ${result.length.toLocaleString()}자로 합쳐 저장했습니다(UTF-8).`);
  }

  return (
    <div className="fm-tool">
      <section className="card fm-step">
        <h2><span>1</span>파일 올리기</h2>
        <FileDrop accept=".txt,.md,.log,.csv,text/plain" multiple hint="텍스트 파일을 여러 개 고르고 순서를 정하세요. 메모장 ANSI(한글)·UTF-8을 자동으로 알아봅니다." onFiles={add} />
        {items.length > 0 && <FileList items={items} onChange={setItems} render={(it) => <small className="muted fm-sub">{it.text.length.toLocaleString()}자 · {it.encoding === "euc-kr" ? "한국어 ANSI" : "UTF-8"}</small>} />}
      </section>

      <section className="card fm-step">
        <h2><span>2</span>합치는 방식</h2>
        <div className="chips">
          {SEPARATORS.map((s) => <button key={s.id} type="button" className={`chip${sepId === s.id ? " on" : ""}`} aria-pressed={sepId === s.id} onClick={() => setSepId(s.id)}>{s.name}</button>)}
        </div>
        {sepId === "custom" && <label>구분자 (\n은 줄바꿈, \t는 탭)<input value={custom} maxLength={200} onChange={(e) => setCustom(e.target.value)} /></label>}
        <div className="fm-opts">
          <label className="fm-check"><input type="checkbox" checked={withName} onChange={(e) => setWithName(e.target.checked)} />각 내용 앞에 [파일명] 줄 넣기</label>
          <label>글자 인코딩
            <select value={enc} onChange={(e) => changeEnc(e.target.value as Encoding)}>
              <option value="auto">자동 인식</option><option value="utf-8">UTF-8</option><option value="euc-kr">한국어 ANSI(CP949)</option>
            </select>
          </label>
        </div>
      </section>

      <section className="card fm-step">
        <h2><span>3</span>미리보기</h2>
        {!items.length ? <p className="muted">파일을 올리면 합친 결과의 앞부분이 여기에 보입니다.</p> : (
          <>
            <p className="fm-summary"><b>{items.length}</b>개 파일 → <b>{result.length.toLocaleString()}</b>자</p>
            <pre className="fm-text">{result.slice(0, 3000)}{result.length > 3000 ? "\n…(이하 생략)" : ""}</pre>
          </>
        )}
      </section>

      <section className="card fm-step">
        <h2><span>4</span>저장</h2>
        <NameInput value={name} onChange={setName} ext=".txt" />
        <Messages error={error} notice={notice} />
        <div className="actions"><button type="button" className="primary" onClick={save} disabled={items.length < 2}><Download size={15} />합쳐서 저장</button></div>
      </section>
    </div>
  );
}
