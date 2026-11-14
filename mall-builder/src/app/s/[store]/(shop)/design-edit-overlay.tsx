"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BLOCK_DEFS, type BlockType } from "@/lib/blocks";
import { inlineEditStartAction, saveInlineEditsAction } from "@/lib/builder/design-actions";

// 디자인 빌더 D7 — 유저 화면 위 바로 편집(운영사에게만, 켤 때만 보임. 유저에게는 아무것도 그리지 않는다)
// 1단계: 첫 화면 블록(<section id="blk-<번호>">)·헤더·바닥글에 ✏ 단추 → 디자인 편집기가 그 블록을 골라 둔 채로 열림(?block=)
// 2단계: 정해진 글자([data-edit-field] — 제목·히어로 문구·타임세일 부제)를 눌러 바로 고치고 「초안 저장」 또는 「유저 화면에 게시」
//        고칠 수 있는 칸 표는 src/lib/builder/inline-edit.ts, 저장은 서버가 다시 검사(저장 검사·동시 편집 검사)
// 블록 그리기 코드를 고치지 않으려고, 이미 있는 블록 이동 지점(id="blk-…")을 찾아 위에 겹쳐 그린다

const KEY = "mb-design-editing";
type Pin = { key: string; label: string; href: string; top: number; left: number; width: number; height: number };
type Conflict = { publish: boolean; at: string };

const blockLabel = (type: string | null) => (type && type in BLOCK_DEFS ? BLOCK_DEFS[type as BlockType].label : "블록");

export default function DesignEditOverlay({ slug, storeId, base }: { slug: string; storeId: string; base: string }) {
  const [on, setOn] = useState(false);
  const [pins, setPins] = useState<Pin[]>([]);
  const [count, setCount] = useState(0);
  const [stamp, setStamp] = useState<string | null>(null);
  const [draftDiffers, setDraftDiffers] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [conflict, setConflict] = useState<Conflict | null>(null);
  const [pending, setPending] = useState(false);
  const edits = useRef(new Map<string, { blockId: string; field: string; value: string }>());
  const editor = `${base}/admin/design`;

  // 새로고침해도 켜 둔 상태 유지(이 탭에서만)
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY) === "1") setOn(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!on) return;
    let alive = true;
    inlineEditStartAction(storeId).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setStamp(r.stamp);
        setDraftDiffers(r.draftDiffers);
      } else setMsg({ ok: false, text: r.error });
    });
    return () => {
      alive = false;
    };
  }, [on, storeId]);

  // 켜져 있는 동안: 점선 표시·글자 바로 고치기·✏ 단추 위치 계산
  useEffect(() => {
    if (!on) return;
    const root = document.documentElement;
    root.setAttribute("data-design-editing", "");
    const fields = () => Array.from(document.querySelectorAll<HTMLElement>('section[id^="blk-"] [data-edit-field]'));
    fields().forEach((el) => {
      el.contentEditable = "plaintext-only";
      el.spellcheck = false;
    });
    const onInput = (e: Event) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-edit-field]");
      const sec = el?.closest("section[id^='blk-']");
      if (!el || !sec) return;
      const blockId = sec.id.slice(4);
      const field = el.dataset.editField!;
      edits.current.set(`${blockId}|${field}`, { blockId, field, value: el.innerText });
      setCount(edits.current.size);
    };
    const onKey = (e: KeyboardEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.<HTMLElement>("[data-edit-field]");
      if (el && e.key === "Enter" && el.dataset.editField !== "text") e.preventDefault(); // 설명 말고는 한 줄
    };
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-edit-field]");
      if (el && el.closest("a")) e.preventDefault(); // 글자를 고치려고 누른 것 — 링크로 이동하지 않음
    };
    document.addEventListener("input", onInput, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("click", onClick, true);

    let raf = 0;
    const measure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const out: Pin[] = [];
        const add = (key: string, el: Element | null, label: string, href: string) => {
          if (!el) return;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) return;
          out.push({ key, label, href, top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height });
        };
        document.querySelectorAll('section[id^="blk-"]').forEach((sec) => {
          const id = sec.id.slice(4);
          add(id, sec, blockLabel(sec.getAttribute("data-block")), `${editor}?block=${encodeURIComponent(id)}`);
        });
        add("header", document.querySelector("header"), "헤더·테마", editor);
        add("footer", document.querySelector("footer"), "바닥글", editor);
        setPins(out);
      });
    };
    measure();
    const t = setInterval(measure, 800);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      root.removeAttribute("data-design-editing");
      fields().forEach((el) => el.removeAttribute("contenteditable"));
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("click", onClick, true);
      clearInterval(t);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [on, editor]);

  const toggle = useCallback(() => {
    if (on) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {}
      if (edits.current.size) return window.location.reload(); // 저장 안 한 글자는 버리고 원래 화면으로
      setOn(false);
      setPins([]);
      setMsg(null);
      return;
    }
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    setOn(true);
  }, [on]);

  async function save(publish: boolean, force = false) {
    setMsg(null);
    setConflict(null);
    setPending(true);
    const r = await saveInlineEditsAction(slug, storeId, [...edits.current.values()], publish, stamp, force);
    setPending(false);
    if (!r.ok) {
      if (r.conflict) setConflict({ publish, at: r.conflict.at });
      return setMsg({ ok: false, text: r.error });
    }
    edits.current.clear();
    setCount(0);
    setStamp(r.base);
    if (publish) return window.location.reload();
    setDraftDiffers(true);
    setMsg({ ok: true, text: "초안에 저장했습니다. 유저 화면은 아직 그대로입니다 — 「유저 화면에 게시」를 누르거나 편집기에서 확인하세요." });
  }

  const btn = "rounded-lg px-3 py-1.5 text-xs font-bold shadow-sm disabled:opacity-50";
  return (
    <>
      {on && (
        <>
          <style>{`
            [data-design-editing] section[id^="blk-"] { outline: 2px dashed rgba(37, 99, 235, 0.45); outline-offset: -2px; }
            [data-design-editing] section[id^="blk-"] [data-edit-field] { outline: 1px dashed #f59e0b; outline-offset: 2px; border-radius: 4px; cursor: text; }
            [data-design-editing] section[id^="blk-"] [data-edit-field]:focus { outline: 2px solid #f59e0b; background: rgba(245, 158, 11, 0.08); }
          `}</style>
          <div className="pointer-events-none absolute left-0 top-0 z-[60]" aria-hidden={false} data-design-pins>
            {pins.map((p) => (
              <a
                key={p.key}
                href={p.href}
                className="pointer-events-auto absolute rounded-md bg-blue-700 px-2 py-1 text-[11px] font-bold text-white shadow-md hover:bg-blue-800"
                style={{ top: p.top + 6, left: Math.max(6, p.left + p.width - 6), transform: "translateX(-100%)" }}
                data-design-pin={p.key}
              >
                ✏ {p.label} — 편집기에서 고치기
              </a>
            ))}
          </div>
        </>
      )}
      <div className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2" data-design-edit-bar>
        {on && (
          <div className="w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 shadow-lg">
            <p className="font-bold">✏️ 디자인 고치기 켜짐 — 운영사에게만 보입니다</p>
            <p className="mt-1">주황 점선 글자를 눌러 바로 고치고, 파란 「✏」 단추로 편집기를 엽니다. 그림·상품·링크는 편집기에서 고칩니다.</p>
            {draftDiffers && <p className="mt-1 rounded bg-amber-100 px-2 py-1">편집기 초안에 아직 게시 안 된 변경이 있습니다 — 「유저 화면에 게시」를 누르면 그 변경도 함께 나갑니다.</p>}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-semibold">고친 글자 {count}곳</span>
              <button type="button" disabled={!count || pending} onClick={() => save(false)} className={`${btn} border border-amber-400 bg-white text-amber-900`} data-inline-save>
                초안 저장
              </button>
              <button type="button" disabled={!count || pending} onClick={() => save(true)} className={`${btn} bg-amber-600 text-white`} data-inline-publish>
                유저 화면에 게시
              </button>
              {pending && <span>처리 중…</span>}
            </div>
            {msg && <p className={`mt-2 ${msg.ok ? "text-green-700" : "text-red-700"}`} data-inline-msg>{msg.text}</p>}
            {conflict && (
              <div className="mt-2 flex flex-wrap gap-2" data-inline-conflict>
                <button type="button" onClick={() => window.location.reload()} className={`${btn} border border-gray-300 bg-white text-gray-800`}>새로 불러오기(고친 글자는 사라짐)</button>
                <button type="button" onClick={() => save(conflict.publish, true)} className={`${btn} bg-red-600 text-white`}>그래도 내 것으로 덮어쓰기</button>
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={toggle} className={`${btn} ${on ? "bg-gray-800 text-white" : "bg-blue-700 text-white"}`} data-design-edit-toggle>
          {on ? (count ? "끄기(고친 글자 버림)" : "✏️ 디자인 고치기 끄기") : "✏️ 디자인 고치기"}
        </button>
      </div>
    </>
  );
}
