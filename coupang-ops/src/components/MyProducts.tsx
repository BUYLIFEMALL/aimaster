"use client";

import { useState, useTransition } from "react";
import { listMyCoupangProductsAction } from "@/lib/actions/listing";
import { LIST_STATUSES, type ListedProduct } from "@/lib/coupang/listing";
import { ItemsPanel } from "@/components/ItemsPanel";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-rose-500 focus:outline-none";
const STATUS_TONE: Record<string, string> = { 승인완료: "bg-teal-50 text-teal-800", 부분승인완료: "bg-teal-50 text-teal-800", 승인반려: "bg-rose-50 text-rose-800", 상품삭제: "bg-slate-100 text-slate-500" };

export function MyProducts({ keysSaved }: { keysSaved: boolean }) {
  const [status, setStatus] = useState("");
  const [name, setName] = useState("");
  const [items, setItems] = useState<ListedProduct[]>([]);
  const [next, setNext] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<number | null>(null);

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await listMyCoupangProductsAction({ status, name, nextToken: more ? next : undefined });
      if (!r.ok) return setError(r.error);
      setItems(more ? [...items, ...r.items] : r.items);
      setNext(r.nextToken);
      setLoaded(true);
    });

  return (
    <section className="slw-card space-y-4 p-5">
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「🔑 쿠팡 연결」에서 키를 저장해 주세요.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-slate-700">
          상태
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 block ${input}`}>
            {LIST_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="min-w-0 flex-1 text-xs font-bold text-slate-700">
          상품명(20자 이내)
          <input value={name} maxLength={20} onChange={(e) => setName(e.target.value)} placeholder="비우면 전체" className={`mt-1 block w-full ${input}`} />
        </label>
        <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
          {pending ? "불러오는 중…" : "쿠팡에서 불러오기"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {loaded && !error && items.length === 0 && <p className="text-sm text-slate-600">조건에 맞는 쿠팡 상품이 없습니다.</p>}
      {items.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
          {items.map((p) => (
            <li key={p.sellerProductId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-[13px]">
              <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${STATUS_TONE[p.statusName] ?? "bg-amber-50 text-amber-800"}`}>{p.statusName || "상태 없음"}</span>
              <span className="min-w-0 flex-1 font-bold text-slate-900">{p.name}</span>
              <span className="text-xs text-slate-500">
                상품번호 {p.sellerProductId}{p.brand ? ` · ${p.brand}` : ""} · 등록 {p.createdAt.slice(0, 10)}
              </span>
              {p.statusName !== "상품삭제" && (
                <button type="button" onClick={() => setOpen(open === p.sellerProductId ? null : p.sellerProductId)} className="rounded border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-800 hover:bg-rose-100">
                  {open === p.sellerProductId ? "닫기" : "옵션 관리"}
                </button>
              )}
              {open === p.sellerProductId && <div className="w-full"><ItemsPanel sellerProductId={p.sellerProductId} /></div>}
            </li>
          ))}
        </ul>
      )}
      {next && (
        <button type="button" disabled={pending} onClick={() => load(true)} className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </section>
  );
}
