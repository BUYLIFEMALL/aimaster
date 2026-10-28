"use client";

import { useEffect, useRef, useState } from "react";
import { getAttrLookupAction, requestAttrLookupAction, suggestAttributesAction, type AttrLookupView } from "@/lib/actions/attributes";
import { attrsToText, parseAttrText, type AttrDef } from "@/lib/smartstore/attributes";

/**
 * 상품속성 고르기 — 「이 카테고리 속성 불러오기」를 누르면 회원 확장이 판매자센터에서 속성 이름·보기를 읽어 온다(저장은 하지 않음).
 * 고른 값은 아래 글 칸(name="attributes")에 「이름: 값1, 값2」로 들어가 기존 등록 흐름 그대로 쓰인다. 글 칸은 직접 고쳐도 된다.
 */
export function AttributePicker({ productId, initialText = "", categoryPath = "" }: { productId: string; initialText?: string; categoryPath?: string }) {
  const [text, setText] = useState(initialText);
  const [view, setView] = useState<AttrLookupView | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [keyLink, setKeyLink] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const picked = parseAttrText(text);
  const attrs = view?.status === "done" ? view.result?.attributes ?? [] : [];
  const order = attrs.map((a) => a.name);
  const missingRequired = attrs.filter((a) => a.required && !picked[a.name]?.length).map((a) => a.name);

  function poll(id: string, started: number) {
    timer.current = setTimeout(async () => {
      const v = await getAttrLookupAction(id);
      setView(v);
      if (!v || v.status === "done" || v.status === "failed") { setBusy(false); setMsg(v?.status === "failed" ? `⚠️ ${v.error ?? "속성을 읽지 못했습니다."}` : ""); return; }
      if (Date.now() - started > 3 * 60_000) { setBusy(false); setMsg("⚠️ 3분 안에 확장이 가져가지 않았습니다. 확장이 켜져 있고 판매자센터에 로그인돼 있는지 확인한 뒤 다시 눌러 주세요."); return; }
      setMsg(v.status === "queued" ? "확장이 가져가기를 기다리는 중… (확장이 켜져 있고 판매자센터에 로그인돼 있어야 합니다)" : "확장이 판매자센터에서 속성을 읽는 중…");
      poll(id, started);
    }, 3000);
  }

  async function load(categoryId?: string) {
    const query = (document.getElementById("categoryKeyword") as HTMLInputElement | null)?.value ?? "";
    setBusy(true);
    setMsg("요청을 만드는 중…");
    const r = await requestAttrLookupAction({ query, path: categoryPath, categoryId });
    if (r.error || !r.id) { setBusy(false); setMsg(`⚠️ ${r.error ?? "요청을 만들지 못했습니다."}`); return; }
    if (timer.current) clearTimeout(timer.current);
    poll(r.id, Date.now());
  }

  // 회원 본인 Claude 키로 추천 — 이미 고른 속성은 덮지 않고 빈 속성만 채운다(회원이 확인 뒤 보냄)
  async function suggest() {
    if (!view?.id) return;
    setSuggesting(true);
    setKeyLink(false);
    setMsg("상세페이지 내용으로 추천하는 중… (회원 본인 Claude 키 사용)");
    const r = await suggestAttributesAction(productId, view.id);
    setSuggesting(false);
    if (r.error || !r.picks) { setMsg(`⚠️ ${r.error ?? "추천하지 못했습니다."}`); setKeyLink(Boolean(r.needKey)); return; }
    const next = { ...picked };
    let added = 0;
    for (const [name, vals] of Object.entries(r.picks)) if (!next[name]?.length) { next[name] = vals; added++; }
    setText(attrsToText(next, order));
    setMsg(added ? `✨ 속성 ${added}개를 추천해 채웠습니다. 상품에 맞는지 확인하고 고쳐 주세요.` : "추천할 수 있는 빈 속성이 없었습니다.");
  }

  function setValues(a: AttrDef, values: string[]) {
    const next = { ...picked, [a.name]: values };
    if (!values.length) delete next[a.name];
    setText(attrsToText(next, order));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="slw-label !mb-0">상품속성 <span className="font-normal text-slate-500">(선택)</span></span>
        <button type="button" onClick={() => load()} disabled={busy} className="rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 disabled:opacity-60">
          🔎 이 카테고리 속성 불러오기
        </button>
      </div>
      {msg && <p className="text-[11px] text-slate-600">{msg}{keyLink && <> <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer" className="font-bold underline">키 등록하러 가기 →</a></>}</p>}

      {view?.status === "done" && view.result && (
        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <label className="block text-[11px] text-slate-600">
            카테고리
            <select
              value={view.result.category.id}
              onChange={(e) => load(e.target.value)}
              disabled={busy}
              className="slw-field mt-1"
            >
              {view.result.candidates.map((c) => <option key={c.id} value={c.id}>{c.path || c.id}</option>)}
            </select>
          </label>
          {attrs.length > 0 && (
            <button type="button" onClick={suggest} disabled={busy || suggesting} className="rounded-lg border border-violet-300 bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800 disabled:opacity-60">
              {suggesting ? "추천하는 중…" : "✨ 상세페이지 내용으로 추천"}
            </button>
          )}
          {!attrs.length && <p className="text-[11px] text-slate-500">이 카테고리에는 고를 수 있는 상품속성이 없습니다.</p>}
          {missingRequired.length > 0 && (
            // 막지는 않는다 — 비워도 판매자센터 저장은 된다(2026-10-28 「바로 등록」 실측, 「다음에 할래요」로 넘어감)
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-relaxed text-amber-900">
              ⚠️ 판매자센터에서 「필수」로 표시한 속성 {missingRequired.length}개가 비어 있습니다: <b>{missingRequired.join(", ")}</b>. 비워도 등록은 되지만, 상품에 맞는 값을 고르면 네이버쇼핑 검색에 상품 정보가 더 정확히 나옵니다.
            </p>
          )}
          {attrs.map((a) => {
            const cur = picked[a.name] ?? [];
            const full = a.max > 0 && cur.length >= a.max;
            return (
              <div key={a.name}>
                <p className="text-xs font-semibold text-slate-700">
                  {a.name}
                  {a.required && <span className="ml-1 rounded bg-rose-100 px-1 text-[10px] text-rose-700">필수</span>}
                  <span className="ml-1 font-normal text-slate-500">{a.type === "MULTI_SELECT" ? `여러 개${a.max ? ` · 최대 ${a.max}개` : ""}` : a.type === "SINGLE_SELECT" ? "한 개" : "직접 입력"}</span>
                </p>
                {a.type === "SINGLE_SELECT" && (
                  <select value={cur[0] ?? ""} onChange={(e) => setValues(a, e.target.value ? [e.target.value] : [])} className="slw-field mt-1">
                    <option value="">선택 안 함</option>
                    {a.values.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                )}
                {a.type === "MULTI_SELECT" && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {a.values.map((v) => {
                      const on = cur.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={!on && full}
                          onClick={() => setValues(a, on ? cur.filter((x) => x !== v) : [...cur, v])}
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${on ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700"} disabled:opacity-40`}
                        >
                          {v}
                        </button>
                      );
                    })}
                  </div>
                )}
                {a.type === "TEXT" && (
                  <input value={cur.join(", ")} onChange={(e) => setValues(a, e.target.value.split(",").map((x) => x.trim()).filter(Boolean))} className="slw-field mt-1" />
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <label className="text-[11px] text-slate-500" htmlFor="attributes">보낼 값 (직접 고쳐도 됩니다, 한 줄에 「속성이름: 값」)</label>
        <textarea id="attributes" name="attributes" rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder={"주요소재: 폴리에스테르\n용도: 여행용"} className="slw-field" />
        <p className="mt-1 text-[11px] text-slate-500">카테고리마다 속성이 다릅니다. 「속성 불러오기」를 누르면 판매자센터에 있는 이름·보기 그대로 고를 수 있습니다(판매자센터에는 아무것도 저장하지 않습니다). 못 찾은 속성은 등록 기록에 「직접 확인할 칸」으로 남습니다.</p>
      </div>
    </div>
  );
}
