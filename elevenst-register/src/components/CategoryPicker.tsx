"use client";

import { useState, useTransition } from "react";
import { browseCategoryAction, describeCategoryAction, searchCategoryAction, type CategoryNodeView } from "@/lib/actions/register";
import type { CategoryHit } from "@/lib/elevenst/category";

const btn = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 hover:border-indigo-300 disabled:opacity-50";

export interface PickedCategory {
  no: string;
  path: string;
}

/** 11번가 카테고리 고르기 — 상품명으로 후보 찾기 · 직접 찾아보기 · 번호 입력. 맨 아래 카테고리만 고를 수 있다 */
export function CategoryPicker({ productName, value, onPick }: { productName: string; value: PickedCategory | null; onPick: (c: PickedCategory | null) => void }) {
  const [query, setQuery] = useState(productName);
  const [hits, setHits] = useState<CategoryHit[] | null>(null);
  const [browse, setBrowse] = useState<{ path: { no: string; name: string }[]; children: CategoryNodeView[] } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const search = () =>
    start(async () => {
      setError("");
      const r = await searchCategoryAction(query);
      if (!r.ok) return setError(r.error);
      setHits(r.hits);
      setBrowse(null);
    });
  const open = (no: string) =>
    start(async () => {
      setError("");
      const r = await browseCategoryAction(no);
      if (!r.ok) return setError(r.error);
      setBrowse({ path: r.path, children: r.children });
      setHits(null);
    });
  const byCode = () =>
    start(async () => {
      setError("");
      const r = await describeCategoryAction(codeInput);
      if (!r.ok) return setError(r.error);
      if (!r.leaf) return setError(`「${r.path}」은 맨 아래 카테고리가 아닙니다. 하위 카테고리 번호를 넣어 주세요.`);
      onPick({ no: codeInput.trim(), path: r.path });
    });

  return (
    <div className="space-y-3">
      {value ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px]">
          <span className="font-bold text-emerald-900">✅ {value.path}</span>
          <span className="font-mono text-[11px] text-emerald-700">#{value.no}</span>
          <button type="button" onClick={() => onPick(null)} className="ml-auto text-[12px] font-bold text-slate-600 underline">
            다시 고르기
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()} aria-label="카테고리 검색어" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" disabled={pending || !query.trim()} onClick={search} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pending ? "찾는 중…" : "🔎 후보 찾기"}
            </button>
            <button type="button" disabled={pending} onClick={() => open("0")} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">
              📂 직접 찾아보기
            </button>
          </div>
          {hits && (
            <ul className="space-y-1">
              {hits.length === 0 && <li className="text-[13px] text-slate-600">맞는 카테고리를 찾지 못했습니다. 낱말을 줄이거나(예: 「텀블러」) 직접 찾아보기를 써 주세요.</li>}
              {hits.map((h) => (
                <li key={h.no}>
                  <button type="button" onClick={() => onPick({ no: h.no, path: h.path })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-[13px] hover:border-indigo-400 hover:bg-indigo-50">
                    {h.path} <span className="font-mono text-[11px] text-slate-400">#{h.no}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {browse && (
            <div className="space-y-2 rounded-lg bg-slate-50 p-2 text-[12px]">
              <p className="font-bold text-slate-700">
                <button type="button" disabled={pending} onClick={() => open("0")} className="underline">
                  전체
                </button>
                {browse.path.map((p) => (
                  <span key={p.no}>
                    {" "}
                    ›{" "}
                    <button type="button" disabled={pending} onClick={() => open(p.no)} className="underline">
                      {p.name}
                    </button>
                  </span>
                ))}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {browse.children.map((c) =>
                  c.leaf ? (
                    <button key={c.no} type="button" onClick={() => onPick({ no: c.no, path: [...browse.path.map((p) => p.name), c.name].join(" › ") })} className="rounded border border-indigo-500 bg-indigo-600 px-2 py-1 text-[12px] font-bold text-white">
                      ✔ {c.name}
                    </button>
                  ) : (
                    <button key={c.no} type="button" disabled={pending} onClick={() => open(c.no)} className={btn}>
                      {c.name} ›
                    </button>
                  ),
                )}
              </div>
              <p className="text-slate-500">파란 단추(✔)가 맨 아래 카테고리입니다. 누르면 바로 고릅니다.</p>
            </div>
          )}
          <details className="text-[12px] text-slate-600">
            <summary className="cursor-pointer font-bold">카테고리 번호를 알고 있으면</summary>
            <div className="mt-2 flex gap-2">
              <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="카테고리 번호" placeholder="예: 1009391" className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
              <button type="button" disabled={pending || !codeInput} onClick={byCode} className={btn}>
                이 번호 쓰기
              </button>
            </div>
          </details>
        </>
      )}
      {error && <p className="text-[13px] font-semibold text-rose-800">❌ {error}</p>}
    </div>
  );
}
