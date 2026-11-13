"use client";

import { useEffect, useState, useTransition } from "react";
import { browseCategoryAction, describeCategoryAction, searchCategoryAction, suggestCategoryAction, type CategoryNodeView } from "@/lib/actions/register";
import type { CategoryHit } from "@/lib/elevenst/category";
import { Search, FolderOpen, CheckCircle2, RotateCcw } from "lucide-react";

export interface PickedCategory {
  no: string;
  path: string;
  /** 상세페이지 카테고리로 미리 고른 것(회원 확인 안내를 보여 줌) */
  auto?: boolean;
}

/** 11번가 카테고리 고르기 — 상품명으로 후보 찾기 · 직접 찾아보기 · 번호 입력. 맨 아래 카테고리만 고를 수 있다 */
export function CategoryPicker({ productName, detailCategory = "", value, onPick }: { productName: string; detailCategory?: string; value: PickedCategory | null; onPick: (c: PickedCategory | null) => void }) {
  const [query, setQuery] = useState(productName);
  const [hits, setHits] = useState<CategoryHit[] | null>(null);
  const [browse, setBrowse] = useState<{ path: { no: string; name: string }[]; children: CategoryNodeView[] } | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  // 처음 열 때: 상세페이지 카테고리 + 상품명으로 후보를 보여 주고, 확실한 1건은 미리 고른다(한 번만)
  useEffect(() => {
    if (!detailCategory.trim() && !productName.trim()) return;
    let alive = true;
    suggestCategoryAction(detailCategory, productName)
      .then((r) => {
        if (!alive || !r.ok) return;
        setHits(r.hits);
        if (r.picked) onPick({ no: r.picked.no, path: r.picked.path, auto: true });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 p-3.5 text-[13px]">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-extrabold text-emerald-950">{value.path}</span>
          <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">#{value.no}</span>
          {value.auto && <span className="w-full text-xs text-emerald-800 mt-0.5">📄 상세페이지 카테고리 「{detailCategory}」를 기반으로 자동 추천되었습니다.</span>}
          <button
            type="button"
            onClick={() => onPick(null)}
            className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-[#FA0050] transition-colors"
          >
            <RotateCcw size={12} />
            <span>카테고리 다시 고르기</span>
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              aria-label="카테고리 검색어"
              placeholder="카테고리 검색어 (예: 텀블러, 무선이어폰)"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-sm focus:border-[#FA0050] focus:ring-2 focus:ring-rose-500/15 focus:outline-none"
            />
            <button
              type="button"
              disabled={pending || !query.trim()}
              onClick={search}
              className="btn-3d-11st !py-2 !px-4 !text-xs flex items-center gap-1.5"
            >
              <Search size={14} />
              <span>{pending ? "검색 중…" : "후보 찾기"}</span>
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => open("0")}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <FolderOpen size={14} />
              <span>직접 찾아보기</span>
            </button>
          </div>
          {hits && (
            <ul className="space-y-1.5 max-h-60 overflow-y-auto">
              {hits.length === 0 && <li className="text-xs text-slate-500 p-2">맞는 카테고리를 찾지 못했습니다. 키워드를 단순화하거나 직접 찾아보기를 사용해 주세요.</li>}
              {hits.map((h) => (
                <li key={h.no}>
                  <button
                    type="button"
                    onClick={() => onPick({ no: h.no, path: h.path })}
                    className="w-full rounded-xl border border-slate-200/90 bg-white p-3 text-left text-xs hover:border-[#FA0050] hover:bg-rose-50/50 transition-all flex items-center justify-between"
                  >
                    <span className="font-semibold text-slate-800">{h.path}</span>
                    <span className="font-mono text-[11px] font-bold text-slate-400">#{h.no}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {browse && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button type="button" onClick={() => open("0")} className="font-bold text-[#FA0050] underline">
                  전체
                </button>
                {browse.path.map((p, idx) => (
                  <span key={p.no} className="flex items-center gap-1 text-slate-500">
                    <span>›</span>
                    {idx === browse.path.length - 1 ? (
                      <span className="font-bold text-slate-800">{p.name}</span>
                    ) : (
                      <button type="button" onClick={() => open(p.no)} className="text-[#FA0050] underline">
                        {p.name}
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                {browse.children.map((c) =>
                  c.leaf ? (
                    <button
                      key={c.no}
                      type="button"
                      onClick={() => onPick({ no: c.no, path: [...browse.path.map((p) => p.name), c.name].join(" > ") })}
                      className="rounded-lg border border-rose-200 bg-rose-50/70 p-2 text-left text-xs font-bold text-[#FA0050] hover:bg-rose-100"
                    >
                      {c.name} (선택)
                    </button>
                  ) : (
                    <button
                      key={c.no}
                      type="button"
                      onClick={() => open(c.no)}
                      className="rounded-lg border border-slate-200 bg-white p-2 text-left text-xs text-slate-700 hover:bg-slate-100"
                    >
                      {c.name} ›
                    </button>
                  )
                )}
              </div>
            </div>
          )}
          {error && <p className="text-xs font-bold text-rose-600">❌ {error}</p>}
        </>
      )}
    </div>
  );
}
