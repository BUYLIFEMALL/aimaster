"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { useData, type AppSettings } from "@/components/DataProvider";
import { byProduct, type ProductCost } from "@/lib/report/aggregate";
import { MARKETS } from "@/lib/orders/markets";
import { MARKET_FEES } from "@/lib/marketFees";
import { saveBlob } from "@/lib/download";

function Num({ value, onChange, placeholder, step = 100 }: { value: number | null | undefined; onChange: (n: number | null) => void; placeholder?: string; step?: number }) {
  return (
    <input
      type="number"
      min={0}
      step={step}
      className="slw-field !py-1 text-right font-mono"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Math.max(0, Number(e.target.value) || 0))}
    />
  );
}

export default function SettingsPage() {
  const { lines, settings, setSettings, saved } = useData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const products = useMemo(() => byProduct(lines, settings).map((r) => r.key), [lines, settings]);

  const setProduct = (key: string, patch: Partial<ProductCost>) =>
    setSettings((s) => ({ ...s, products: { ...s.products, [key]: { ...(s.products[key] ?? { unitCost: 0, packCost: 0 }), ...patch } } }));

  function exportSettings() {
    saveBlob(`주문리포트_설정_${new Date().toISOString().slice(0, 10)}.json`, new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" }));
  }

  async function importSettings(file: File | undefined) {
    if (!file) return;
    try {
      const s = JSON.parse(await file.text()) as Partial<AppSettings>;
      if (typeof s !== "object" || !s || typeof s.products !== "object") throw new Error();
      setSettings((prev) => ({ ...prev, ...s, products: { ...prev.products, ...s.products }, marketFeePct: { ...prev.marketFeePct, ...s.marketFeePct }, mappings: { ...prev.mappings, ...s.mappings } }));
      setMsg("설정 파일을 불러왔습니다.");
    } catch {
      setMsg("설정 파일을 읽지 못했습니다. 이 프로그램에서 내보낸 .json 파일인지 확인해 주세요.");
    }
  }

  return (
    <div>
      <PageHeader emoji="⚙" title="원가·수수료 설정" description="넣은 값은 이 PC에만 저장됩니다. 다른 PC에서도 쓰려면 설정 파일로 옮기세요." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="slw-card p-4">
          <h2 className="mb-1 text-sm font-extrabold text-slate-900">상품별 원가 · 포장비 · 수수료</h2>
          <p className="mb-3 text-[12px] text-slate-600">올린 주문에 나온 상품이 자동으로 나옵니다. 수수료를 비우면 마켓 기본값을 씁니다(파일에 정산액이 있으면 그 값 우선).</p>
          {products.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-600">주문 파일을 올리면 상품 목록이 생깁니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[13px]">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[12px] text-slate-600">
                    <th className="py-2 pr-2">상품 · 옵션</th><th className="w-28 pr-2">개당 원가(원)</th><th className="w-28 pr-2">개당 포장비(원)</th><th className="w-24 pr-2">수수료(%)</th><th className="w-24">현재 재고</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((k) => {
                    const p = settings.products[k];
                    return (
                      <tr key={k} className="border-b border-slate-100">
                        <td className="max-w-[260px] truncate py-1.5 pr-2" title={k}>{k}</td>
                        <td className="pr-2"><Num value={p?.unitCost || null} placeholder="0" onChange={(n) => setProduct(k, { unitCost: n ?? 0 })} /></td>
                        <td className="pr-2"><Num value={p?.packCost || null} placeholder="0" onChange={(n) => setProduct(k, { packCost: n ?? 0 })} /></td>
                        <td className="pr-2"><Num value={p?.feePct} step={0.1} placeholder="기본" onChange={(n) => setProduct(k, { feePct: n })} /></td>
                        <td><Num value={p?.stock} step={1} placeholder="—" onChange={(n) => setProduct(k, { stock: n })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="slw-card space-y-3 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">마켓 기본 수수료(%)</h2>
            {MARKETS.map((m) => (
              <label key={m.id} className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2 text-[13px]">
                <span>{m.label} {MARKET_FEES[m.id].verified ? "✅" : "⚠"}</span>
                <Num value={settings.marketFeePct[m.id] ?? null} step={0.1} placeholder={`${MARKET_FEES[m.id].ratePct}`} onChange={(n) => setSettings((s) => ({ ...s, marketFeePct: { ...s.marketFeePct, [m.id]: n ?? undefined } }))} />
              </label>
            ))}
            <p className="text-[12px] leading-relaxed text-slate-600">✅ 마켓 공식 표 확인(2026-10-25) · ⚠ 공식 표 미확인 대표값. 카테고리마다 다르니 판매자센터 값으로 바꿔 쓰세요.</p>
          </section>
          <section className="slw-card space-y-3 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">택배비 · 광고비</h2>
            <label className="block">
              <span className="slw-label">주문 1건당 실제 택배비(원)</span>
              <Num value={settings.courierPerOrder || null} placeholder="0" onChange={(n) => setSettings((s) => ({ ...s, courierPerOrder: n ?? 0 }))} />
            </label>
            <label className="block">
              <span className="slw-label">리포트 기간 광고비 합계(원)</span>
              <Num value={settings.adCost || null} step={1000} placeholder="0" onChange={(n) => setSettings((s) => ({ ...s, adCost: n ?? 0 }))} />
            </label>
            <p className="text-[12px] text-slate-600">광고비는 리포트에서 고른 기간 전체에 한 번 뺍니다.</p>
          </section>
          <section className="slw-card space-y-2 p-4">
            <h2 className="text-sm font-extrabold text-slate-900">설정 옮기기</h2>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="slw-btn" onClick={exportSettings}><Download size={14} /> 설정 파일 받기</button>
              <button type="button" className="slw-btn" onClick={() => fileRef.current?.click()}><Upload size={14} /> 설정 파일 불러오기</button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void importSettings(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
            {msg && <Notice>{msg}</Notice>}
            {!saved && <Notice tone="warn">이 브라우저에서 저장이 막혀 있습니다(사생활 보호 창 등). 창을 닫으면 설정이 사라지니 설정 파일로 받아 두세요.</Notice>}
          </section>
        </div>
      </div>
    </div>
  );
}
