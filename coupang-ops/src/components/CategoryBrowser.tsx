"use client";

import { useState, useTransition } from "react";
import { browseCategoryAction } from "@/lib/actions/product";
import type { CategoryNode } from "@/lib/coupang/category";

const btn = "rounded border border-slate-300 bg-white px-2 py-1 text-[12px] font-bold text-slate-700 disabled:opacity-50";

/** A4 카테고리 찾아보기. 누를 때만 쿠팡을 한 번 읽는다. 하위가 없는 맨 아래 카테고리만 고를 수 있다 */
export function CategoryBrowser({ disabled, onPick }: { disabled: boolean; onPick: (code: number) => void }) {
  const [path, setPath] = useState<{ code: number; name: string }[]>([]);
  const [rows, setRows] = useState<CategoryNode[] | null>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const open = (code: number, nextPath: { code: number; name: string }[]) =>
    start(async () => {
      setError("");
      const r = await browseCategoryAction(code);
      if (!r.ok) return setError(r.error);
      setPath(nextPath);
      setRows(r.children);
    });
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-2 text-[12px]">
      <button type="button" disabled={disabled || pending} onClick={() => open(0, [])} className={btn}>{pending ? "쿠팡에 묻는 중…" : "📂 카테고리 직접 찾아보기"}</button>
      {rows && (
        <>
          <p className="font-bold text-slate-700">
            <button type="button" disabled={pending} onClick={() => open(0, [])} className="underline">전체</button>
            {path.map((p, i) => (
              <span key={p.code}> › <button type="button" disabled={pending} onClick={() => open(p.code, path.slice(0, i + 1))} className="underline">{p.name}</button></span>
            ))}
          </p>
          {rows.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {rows.map((c) => <button key={c.code} type="button" disabled={pending} onClick={() => open(c.code, [...path, { code: c.code, name: c.name }])} className={btn}>{c.name}</button>)}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-700">맨 아래 카테고리입니다(번호 {path[path.length - 1]?.code}).</span>
              <button type="button" disabled={!path.length} onClick={() => onPick(path[path.length - 1].code)} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 font-bold text-white disabled:opacity-50">이 카테고리 쓰기</button>
            </div>
          )}
        </>
      )}
      {error && <p className="text-rose-800">❌ {error}</p>}
    </div>
  );
}
