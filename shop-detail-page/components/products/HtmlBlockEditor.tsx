"use client";

import { useEffect, useMemo, useState } from "react";
import { NOTICE_STORE_KEY, noticeHtml, normalizeNotice } from "@/lib/detailBlocks";
import { sanitizeGeneratedHtml } from "@/lib/ai/htmlDetailPrompt";

// v1.37(E3, 2026-10-26): 만든 HTML 상세페이지를 블록(제목·문단·이미지·안내)으로 나눠 ▲▼🗑·글 고치기·안내 블록 넣기.
// 브라우저 DOMParser로 나누고, 고친 블록으로 HTML을 다시 만들어 부모(미리보기·내려받기·복사)에 넘긴다. 서버 저장 없음.
// 글은 textContent로만 바꿔 넣으므로 회원 입력이 HTML로 해석되지 않는다. 결과는 sanitizeGeneratedHtml로 한 번 더 정리.

interface Block { id: number; html: string }
let seq = 0;

/** 내용이 있는 가장 바깥 묶음까지 내려간다(자식이 하나뿐인 감싸기 div는 건너뜀) */
function findContainer(doc: Document): Element {
  let el: Element = doc.body;
  while (el.children.length === 1 && !Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent?.trim())) {
    const only = el.children[0];
    if (only.tagName === "IMG") break;
    el = only;
  }
  return el;
}

function textNodes(root: Node): Text[] {
  const out: Text[] = [];
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const p = n.parentElement?.tagName;
    if (p === "STYLE" || p === "SCRIPT") continue;
    if (n.textContent?.trim()) out.push(n as Text);
  }
  return out;
}

function fragment(html: string): Element {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return doc.body.firstElementChild ?? doc.body;
}

function summary(html: string): { kind: string; text: string } {
  const el = fragment(html);
  const imgs = el.tagName === "IMG" ? 1 : el.querySelectorAll("img").length;
  const text = textNodes(el).map((t) => t.textContent!.trim()).join(" ").slice(0, 60);
  if (el.getAttribute("data-block") === "shipping-notice") return { kind: "🚚 배송·교환 안내", text };
  return { kind: imgs && !text ? `🖼 이미지${imgs > 1 ? ` ${imgs}장` : ""}` : imgs ? `🧩 글+이미지 ${imgs}장` : "📝 글", text };
}

/** HTML 전체 → 블록 목록 */
export function splitBlocks(html: string): Block[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(findContainer(doc).children).map((c) => ({ id: ++seq, html: c.outerHTML }));
}

/** 원본 HTML의 머리(<head>·스타일)와 바깥 묶음은 그대로 두고 블록만 바꿔 끼운다 */
export function joinBlocks(original: string, blocks: Block[]): string {
  const doc = new DOMParser().parseFromString(original, "text/html");
  findContainer(doc).innerHTML = blocks.map((b) => b.html).join("\n");
  return sanitizeGeneratedHtml("<!DOCTYPE html>\n" + doc.documentElement.outerHTML);
}

/** 블록 안 글만(「글만 복사」용) */
export function blocksText(blocks: Block[]): string {
  return blocks.map((b) => textNodes(fragment(b.html)).map((t) => t.textContent!.trim()).join("\n")).filter(Boolean).join("\n\n");
}

export function HtmlBlockEditor({ original, onChange }: { original: string; onChange: (html: string, text: string) => void }) {
  const [blocks, setBlocks] = useState<Block[]>(() => splitBlocks(original));
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => { onChange(joinBlocks(original, blocks), blocksText(blocks)); }, [blocks, original, onChange]);

  const move = (i: number, d: -1 | 1) => setBlocks((bs) => { const j = i + d; if (j < 0 || j >= bs.length) return bs; const n = bs.slice(); [n[i], n[j]] = [n[j], n[i]]; return n; });
  const remove = (id: number) => setBlocks((bs) => bs.filter((b) => b.id !== id));

  function setText(id: number, idx: number, value: string) {
    setBlocks((bs) => bs.map((b) => {
      if (b.id !== id) return b;
      const el = fragment(b.html);
      const nodes = textNodes(el);
      if (nodes[idx]) nodes[idx].textContent = value;
      return { ...b, html: el.outerHTML };
    }));
  }

  function addNotice() {
    let saved: unknown = null;
    try { saved = JSON.parse(localStorage.getItem(NOTICE_STORE_KEY) ?? "null"); } catch { /* 저장소가 막혀도 안내만 */ }
    const html = noticeHtml(normalizeNotice(saved));
    if (!html) { setNote("이 화면의 「🚚 배송·교환·환불 안내」 카드를 먼저 채워 주세요."); return; }
    setBlocks((bs) => [...bs.filter((b) => !b.html.includes('data-block="shipping-notice"')), { id: ++seq, html }]);
    setNote("✅ 맨 끝에 배송·교환 안내 블록을 넣었습니다(이미 있던 안내 블록은 새 내용으로 바꿈).");
  }

  const summaries = useMemo(() => blocks.map((b) => summary(b.html)), [blocks]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-800">✏️ 블록 편집 <span className="font-semibold text-slate-500">— {blocks.length}개 블록, 바꾸면 미리보기에 바로 반영</span></p>
        <div className="flex gap-1.5">
          <button type="button" onClick={addNotice} className="text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">🚚 배송·교환 안내 넣기</button>
          <button type="button" onClick={() => { setBlocks(splitBlocks(original)); setNote("처음 만든 HTML로 되돌렸습니다."); }} className="text-[11px] font-bold text-slate-500 hover:text-slate-800 px-2 py-1">↺ 처음대로</button>
        </div>
      </div>
      {note && <p role="status" className="text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-1.5">{note}</p>}
      <ol className="space-y-1.5 max-h-[420px] overflow-y-auto">
        {blocks.map((b, i) => {
          const s = summaries[i];
          const nodes = open === b.id ? textNodes(fragment(b.html)).slice(0, 40) : [];
          return (
            <li key={b.id} className="rounded-lg border border-slate-200 bg-slate-50/60">
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span className="text-[11px] font-black text-blue-600 font-mono shrink-0">#{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[11px] font-bold text-slate-700 shrink-0">{s.kind}</span>
                <span className="text-[11px] text-slate-500 truncate min-w-0 flex-1">{s.text}</span>
                <span className="flex items-center gap-0.5 shrink-0">
                  {s.text && <button type="button" onClick={() => setOpen(open === b.id ? null : b.id)} className="h-6 px-1.5 text-[11px] font-bold text-slate-600 bg-white rounded border border-slate-200">{open === b.id ? "닫기" : "글 고치기"}</button>}
                  <button type="button" aria-label="위로" onClick={() => move(i, -1)} disabled={i === 0} className="w-6 h-6 text-[11px] font-bold text-slate-500 bg-white rounded border border-slate-200 disabled:opacity-30">↑</button>
                  <button type="button" aria-label="아래로" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="w-6 h-6 text-[11px] font-bold text-slate-500 bg-white rounded border border-slate-200 disabled:opacity-30">↓</button>
                  <button type="button" aria-label="빼기" onClick={() => remove(b.id)} className="w-6 h-6 text-[11px] text-rose-600 bg-white rounded border border-slate-200">🗑</button>
                </span>
              </div>
              {open === b.id && (
                <div className="px-2.5 pb-2.5 space-y-1.5">
                  {nodes.map((n, k) => (
                    <textarea key={k} defaultValue={n.textContent ?? ""} rows={Math.min(4, Math.ceil((n.textContent?.length ?? 0) / 40) || 1)}
                      onBlur={(e) => setText(b.id, k, e.target.value)}
                      className="w-full text-xs rounded-md border border-slate-200 bg-white px-2 py-1.5" aria-label={`#${i + 1} 글 ${k + 1}`} />
                  ))}
                  <p className="text-[10px] text-slate-400">칸을 벗어나면 반영됩니다. 이미지는 섹션 카드에서 바꿔 주세요.</p>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
