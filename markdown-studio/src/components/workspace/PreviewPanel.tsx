"use client";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { MarkdownPreview, sanitizedMarkdown } from "./MarkdownPreview";

type Heading = { level: number; text: string };
function headingsOf(html: string): Heading[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(h => ({ level: Number(h.tagName[1]), text: h.textContent?.trim() || "(제목 없음)" }));
}
export const countText = (md: string) => ({ chars: md.length, words: (md.match(/\S+/g) || []).length });

/** 미리보기 + HTML 소스 보기·복사 + 목차 + 글자 수 */
export function PreviewPanel({ markdown }: { markdown: string }) {
  const [mode, setMode] = useState<"preview" | "html">("preview");
  const [toc, setToc] = useState(false);
  const [note, setNote] = useState("");
  const box = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(markdown);
  const html = useMemo(() => sanitizedMarkdown(deferred), [deferred]);
  const heads = useMemo(() => (toc ? headingsOf(html) : []), [html, toc]);
  const stats = useMemo(() => countText(markdown), [markdown]);

  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setNote(`${what}을(를) 복사했습니다.`); }
    catch { setNote("브라우저가 복사를 허용하지 않았습니다. 직접 선택해 복사해 주세요."); }
  }
  function jump(index: number) {
    const el = box.current?.querySelectorAll("h1,h2,h3,h4,h5,h6")[index];
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  return <div className="preview-panel">
    <div className="preview-toolbar">
      <span className="pane-stat" aria-label="글자 수">{stats.chars.toLocaleString()}자 · {stats.words.toLocaleString()}단어</span>
      <div className="actions">
        <button type="button" aria-pressed={mode === "html"} onClick={() => { setMode(mode === "html" ? "preview" : "html"); setNote(""); }}>{mode === "html" ? "미리보기 보기" : "HTML 소스"}</button>
        <button type="button" aria-pressed={toc} onClick={() => setToc(!toc)}>목차</button>
        <button type="button" onClick={() => copy(markdown, "마크다운 원문")}>MD 복사</button>
        <button type="button" onClick={() => copy(html, "HTML")}>HTML 복사</button>
      </div>
    </div>
    {note ? <p className="tool-message" role="status">{note}</p> : null}
    {toc && mode === "preview" ? <nav className="toc" aria-label="목차">{heads.length ? heads.map((h, i) => <button type="button" key={i} style={{ paddingLeft: 8 + (h.level - 1) * 12 }} onClick={() => jump(i)}>{h.text}</button>) : <p className="muted">제목(#)이 없습니다.</p>}</nav> : null}
    {mode === "html" ? <pre className="html-source" aria-label="HTML 소스">{html}</pre> : <div ref={box}><MarkdownPreview markdown={markdown}/></div>}
  </div>;
}
