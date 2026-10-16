"use client";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownPreview, sanitizedMarkdown } from "./MarkdownPreview";
import { showToast } from "@/components/ui/Toast";
import { readingLabel } from "@/lib/documents/readingTime";

type Heading = { level: number; text: string };
function headingsOf(html: string): Heading[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.querySelectorAll("h1,h2,h3,h4,h5,h6")).map(h => ({ level: Number(h.tagName[1]), text: h.textContent?.trim() || "(제목 없음)" }));
}
export const countText = (md: string) => ({ chars: md.length, words: (md.match(/\S+/g) || []).length });

/** 스크롤되는 가장 가까운 조상(없으면 null = 창 전체) */
function scrollParentOf(el: HTMLElement | null): HTMLElement | null {
  for (let p = el?.parentElement ?? null; p; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
  }
  return null;
}

/** 미리보기 + HTML 소스 보기·복사 + 목차 미니맵 + 글자 수·예상 읽기 시간 */
export function PreviewPanel({ markdown }: { markdown: string }) {
  const [mode, setMode] = useState<"preview" | "html">("preview");
  const [toc, setToc] = useState(false);
  const [activeHead, setActiveHead] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const deferred = useDeferredValue(markdown);
  const html = useMemo(() => sanitizedMarkdown(deferred), [deferred]);
  const heads = useMemo(() => (toc ? headingsOf(html) : []), [html, toc]);
  const stats = useMemo(() => countText(markdown), [markdown]);

  async function copy(text: string, what: string) {
    // 2026-10-17 v1.12: 결과를 오른쪽 아래 토스트로 확실히 알린다
    try { await navigator.clipboard.writeText(text); showToast(`${what}을(를) 클립보드에 복사했습니다.`); }
    catch { showToast("브라우저가 복사를 허용하지 않았습니다. 직접 선택해 복사해 주세요.", "error"); }
  }
  function jump(index: number) {
    const el = box.current?.querySelectorAll("h1,h2,h3,h4,h5,h6")[index];
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
    setActiveHead(index);
  }

  // 2026-10-17 v1.12 목차 미니맵: 스크롤 위치에 맞는 제목을 강조한다
  useEffect(() => {
    if (!toc || mode !== "preview" || !box.current) return;
    const container = scrollParentOf(box.current);
    const target: HTMLElement | Window = container ?? window;
    const onScroll = () => {
      const list = box.current?.querySelectorAll("h1,h2,h3,h4,h5,h6");
      if (!list || !list.length) return;
      const top = (container ? container.getBoundingClientRect().top : 0) + 90;
      let idx = 0;
      list.forEach((h, i) => { if (h.getBoundingClientRect().top <= top) idx = i; });
      setActiveHead(idx);
    };
    onScroll();
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [toc, mode, html]);

  return <div className="preview-panel">
    <div className="preview-toolbar">
      <span className="pane-stat" aria-label="글자 수와 예상 읽기 시간">{readingLabel(markdown)} · {stats.chars.toLocaleString()}자 · {stats.words.toLocaleString()}단어</span>
      <div className="actions">
        <button type="button" aria-pressed={mode === "html"} onClick={() => setMode(mode === "html" ? "preview" : "html")}>{mode === "html" ? "미리보기 보기" : "HTML 소스"}</button>
        <button type="button" aria-pressed={toc} onClick={() => setToc(!toc)}>목차</button>
        <button type="button" onClick={() => copy(markdown, "마크다운 원문")}>MD 복사</button>
        <button type="button" onClick={() => copy(html, "HTML")}>HTML 복사</button>
      </div>
    </div>
    {toc && mode === "preview" ? <nav className="toc toc-minimap" aria-label="목차">{heads.length ? heads.map((h, i) => <button type="button" key={i} className={i === activeHead ? "active" : ""} aria-current={i === activeHead ? "location" : undefined} style={{ paddingLeft: 8 + (h.level - 1) * 12 }} onClick={() => jump(i)}>{h.text}</button>) : <p className="muted">제목(#)이 없습니다.</p>}</nav> : null}
    {mode === "html" ? <pre className="html-source" aria-label="HTML 소스">{html}</pre> : <div ref={box}><MarkdownPreview markdown={markdown}/></div>}
  </div>;
}
