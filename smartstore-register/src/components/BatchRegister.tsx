"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createBatchJobsAction } from "@/lib/actions/register";
import { REGISTER_MODES } from "@/lib/smartstore/fields";

export type BatchRow = { id: string; title: string; price: number | null; salePrice: number | null; category: string | null; reviewed: boolean; updated: string };

const won = (n: number | null) => (n == null ? "—" : `${n.toLocaleString("ko-KR")}원`);
const MAX = 20;

/** 상품 목록 + 여러 상품 연속 보내기(2026-10-27 v1.14). 카드를 누르면 한 상품 화면, 왼쪽 상자로 고르면 아래 「연속 보내기」. */
export function BatchRegister({ rows }: { rows: BatchRow[] }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [mode, setMode] = useState<"temp_save" | "register">("temp_save");
  const [state, action, pending] = useActionState(createBatchJobsAction, {});
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? p : [...p, id]));

  return (
    <form action={action} className="space-y-4">
      <ul className="grid gap-3 sm:grid-cols-2">
        {rows.map((p) => (
          <li key={p.id} className={`slw-card flex gap-3 p-4 transition ${picked.includes(p.id) ? "border-emerald-400 bg-emerald-50/40" : "hover:border-emerald-300"}`}>
            <input type="checkbox" name="productIds" value={p.id} checked={picked.includes(p.id)} onChange={() => toggle(p.id)} aria-label={`${p.title} 고르기`} className="mt-1 h-4 w-4 shrink-0 accent-emerald-600" />
            <Link href={`/products/${p.id}`} className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-extrabold text-slate-900">{p.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${p.reviewed ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.reviewed ? "✅ 검토 완료" : "검토 전"}</span>
              </div>
              <p className="mt-1 text-xs text-slate-600">정상가 {won(p.price)}{p.salePrice ? ` · 할인가 ${won(p.salePrice)}` : ""} · {p.category || "카테고리 미정"}</p>
              <p className="mt-1 text-[11px] text-slate-500">상세페이지 수정 {p.updated}</p>
            </Link>
          </li>
        ))}
      </ul>

      {rows.length > 0 && (
        <div className="slw-card sticky bottom-3 space-y-3 p-4 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">🚚 여러 상품 연속 보내기 <span className="font-normal text-slate-500">— {picked.length}개 고름(최대 {MAX}개)</span></p>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => setPicked(rows.slice(0, MAX).map((r) => r.id))} className="rounded border border-slate-200 px-2 py-1">위에서 {Math.min(MAX, rows.length)}개 고르기</button>
              <button type="button" onClick={() => setPicked([])} className="rounded border border-slate-200 px-2 py-1">모두 풀기</button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(["temp_save", "register"] as const).map((m) => (
              <label key={m} className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-xs ${mode === m ? "border-emerald-500 bg-emerald-50" : "border-slate-200"}`}>
                <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-0.5" />
                <span><b>{REGISTER_MODES[m].label}</b><br />{REGISTER_MODES[m].hint}</span>
              </label>
            ))}
          </div>
          {mode === "register" && (
            <label className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              <input type="checkbox" name="confirmRegister" className="mt-0.5" />
              <span>고른 상품이 실제로 스마트스토어에 등록되는 것을 확인했습니다. 이미 「바로 등록」한 상품은 자동으로 건너뜁니다.</span>
            </label>
          )}
          <p className="text-[11px] text-slate-500">상품마다 마지막에 보낸 입력(카테고리 검색어·옵션·태그·주요정보·상품속성·추가상품)을 그대로 씁니다. 처음 보내는 상품은 기본값만 들어갑니다. 「입력만」과 예약구매는 한 상품 화면에서 보내 주세요. 확장은 한 상품씩 차례로 처리합니다.</p>
          <button type="submit" disabled={pending || picked.length === 0} className="slw-primary w-full disabled:opacity-50">{pending ? "작업 만드는 중…" : `고른 ${picked.length}개 상품 연속 보내기`}</button>
          {state.error && <p className="text-sm font-bold text-rose-700">⚠️ {state.error}</p>}
          {state.created && (
            <div className="space-y-1 text-xs">
              {state.created.length > 0 && <p className="font-bold text-emerald-700">✅ {state.created.length}개 작업을 만들었습니다: {state.created.join(", ")} — <Link href="/history" className="underline">등록 기록에서 진행 보기</Link></p>}
              {(state.skipped ?? []).map((s) => <p key={s} className="text-amber-800">건너뜀: {s}</p>)}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
