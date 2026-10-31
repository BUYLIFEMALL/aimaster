"use client";

import { useState, useTransition } from "react";
import { savePrefsAction } from "@/lib/actions/prefs";
import { WATCH_CALLS_PER_MONTH, WATCH_MAX, type StockWatch } from "@/lib/coupang/stock";

type Option = { vendorItemId: number; productName: string; itemName: string };
const labelOf = (o: Option) => `${o.productName} ${o.itemName}`.trim().slice(0, 60);

/** R9 품절 임박 자동 알림 — 고른 옵션만 아침 요약 때 읽는다. 기본은 아무것도 고르지 않은 상태 */
export function StockWatchPanel({ initial, options, limit }: { initial: StockWatch[]; options: Option[]; limit: number }) {
  const [saved, setSaved] = useState(initial);
  const [picked, setPicked] = useState(initial);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  const has = (id: number) => picked.some((w) => w.vendorItemId === id);
  const toggle = (w: StockWatch) => {
    setNote("");
    if (has(w.vendorItemId)) return setPicked(picked.filter((x) => x.vendorItemId !== w.vendorItemId));
    if (picked.length >= WATCH_MAX) return setNote(`최대 ${WATCH_MAX}개까지 고를 수 있습니다.`);
    setPicked([...picked, w]);
  };
  const save = () =>
    start(async () => {
      const r = await savePrefsAction({ stockWatch: picked, stockLimit: limit });
      if (!r.ok) return setNote(`❌ ${r.error}`);
      setSaved(r.prefs.stockWatch);
      setNote(picked.length ? `✅ 저장했습니다. 다음 아침 요약부터 ${picked.length}개를 확인합니다.` : "✅ 자동 확인을 껐습니다.");
    });

  const extra = options.filter((o) => !picked.some((w) => w.vendorItemId === o.vendorItemId));
  const changed = JSON.stringify(picked) !== JSON.stringify(saved);

  return (
    <section className="slw-card space-y-3 p-5">
      <div>
        <h2 className="text-base font-extrabold text-slate-900">📣 품절 임박 자동 알림</h2>
        <p className="mt-1 text-[13px] text-slate-600">고른 옵션의 재고를 매일 아침 요약 때 확인해, {limit}개 이하이거나 품절이면 요약에 함께 알려 드립니다. 잘 팔리는 옵션만 고르세요. 「아침 요약 알림」이 켜져 있어야 동작합니다.</p>
        <p className="mt-1 text-[12px] text-slate-500">지금 {picked.length} / {WATCH_MAX}개 · 쿠팡 호출이 한 달 약 {picked.length * WATCH_CALLS_PER_MONTH}회 늘어납니다(Fixie 무료 요금은 월 500회).</p>
      </div>

      {picked.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-[13px]">
          {picked.map((w) => (
            <li key={w.vendorItemId} className="flex items-center justify-between gap-2 px-3 py-1.5">
              <span className="min-w-0 truncate text-slate-800">{w.label}</span>
              <button type="button" onClick={() => toggle(w)} className="shrink-0 rounded border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-700">빼기</button>
            </li>
          ))}
        </ul>
      )}

      {extra.length > 0 ? (
        <details className="rounded-lg border border-slate-200 px-3 py-2 text-[13px]">
          <summary className="cursor-pointer font-bold text-slate-700">위 점검에서 읽은 옵션 {extra.length}개에서 고르기</summary>
          <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
            {extra.map((o) => (
              <label key={o.vendorItemId} className="flex items-center gap-2 text-slate-800">
                <input type="checkbox" checked={false} onChange={() => toggle({ vendorItemId: o.vendorItemId, label: labelOf(o) })} />
                <span className="min-w-0 truncate">{labelOf(o)}</span>
              </label>
            ))}
          </div>
        </details>
      ) : (
        picked.length === 0 && <p className="text-[12px] text-slate-500">먼저 위에서 재고를 점검하면 여기서 옵션을 고를 수 있습니다.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={pending || !changed} onClick={save} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">{pending ? "저장 중…" : "자동 알림 저장"}</button>
        {note && <span role="status" className="text-[13px] font-bold text-slate-800">{note}</span>}
      </div>
    </section>
  );
}
