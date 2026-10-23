"use client";

// 카드 한 장의 레이아웃(v1.17)과 데이터(번호 목록 항목·A vs B 두 칸·큰 숫자)를 고치는 편집기
import { Plus, Trash2 } from "lucide-react";
import { INPUT, SELECT } from "./ui";
import type { CardLayout, CardPage, CardPoint } from "@/lib/cardnews/types";

export const LAYOUT_OPTIONS: { value: CardLayout; label: string; hint: string }[] = [
  { value: "background", label: "배경형", hint: "배경 이미지 위 큰 글씨(표지·감성 문장)" },
  { value: "list", label: "번호 목록", hint: "항목 2~4개를 번호 상자로" },
  { value: "vs", label: "A vs B", hint: "두 가지를 좌우로 비교" },
  { value: "number", label: "큰 숫자", hint: "핵심 수치 하나를 크게" },
];

type Patch = Partial<Pick<CardPage, "layout" | "points" | "number">>;

export function LayoutEditor({ page, onChange }: { page: CardPage; onChange: (patch: Patch) => void }) {
  const layout = page.layout ?? "background";
  const points = page.points ?? [];
  const setPoint = (i: number, p: Partial<CardPoint>) => onChange({ points: points.map((x, k) => (k === i ? { ...x, ...p } : x)) });

  const changeLayout = (next: CardLayout) => {
    if (next === "list") onChange({ layout: next, points: points.length >= 2 ? points.slice(0, 4) : [...points, { title: "", desc: "" }, { title: "", desc: "" }].slice(0, Math.max(2, points.length)) });
    else if (next === "vs") onChange({ layout: next, points: [points[0] ?? { title: "A", desc: "" }, points[1] ?? { title: "B", desc: "" }] });
    else if (next === "number") onChange({ layout: next, number: page.number ?? { value: "", label: "" } });
    else onChange({ layout: next });
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-bold text-slate-300" htmlFor={`layout-${page.id}`}>카드 레이아웃</label>
        <select id={`layout-${page.id}`} className={`${SELECT} max-w-40`} value={layout} onChange={(e) => changeLayout(e.target.value as CardLayout)}>
          {LAYOUT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="text-[11px] text-slate-500">{LAYOUT_OPTIONS.find((o) => o.value === layout)?.hint}</span>
      </div>

      {(layout === "list" || layout === "vs") && (
        <div className="space-y-2">
          {points.map((p, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
              <input className={INPUT} value={p.title} maxLength={60} placeholder={layout === "vs" ? (i === 0 ? "왼쪽 이름(예: 전세)" : "오른쪽 이름(예: 월세)") : `${i + 1}번 항목 제목`} aria-label={`${i + 1}번 제목`} onChange={(e) => setPoint(i, { title: e.target.value })} />
              <textarea className={`${INPUT} min-h-11`} value={p.desc} maxLength={200} placeholder={layout === "vs" ? "특징을 줄바꿈으로 3~5줄" : "한 줄 설명"} aria-label={`${i + 1}번 설명`} onChange={(e) => setPoint(i, { desc: e.target.value })} />
              {layout === "list" && points.length > 2 ? (
                <button type="button" aria-label={`${i + 1}번 항목 빼기`} onClick={() => onChange({ points: points.filter((_, k) => k !== i) })} className="self-start rounded-lg p-2 text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
              ) : <span />}
            </div>
          ))}
          {layout === "list" && points.length < 4 && (
            <button type="button" onClick={() => onChange({ points: [...points, { title: "", desc: "" }] })} className="inline-flex items-center gap-1 text-xs font-bold text-purple-300 hover:text-purple-200"><Plus className="h-3.5 w-3.5" /> 항목 추가(최대 4개)</button>
          )}
        </div>
      )}

      {layout === "number" && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <input className={INPUT} value={page.number?.value ?? ""} maxLength={16} placeholder="숫자(예: 84점)" aria-label="큰 숫자" onChange={(e) => onChange({ number: { value: e.target.value, label: page.number?.label ?? "" } })} />
          <input className={INPUT} value={page.number?.label ?? ""} maxLength={60} placeholder="숫자의 의미(예: 청약 가점 만점)" aria-label="숫자 설명" onChange={(e) => onChange({ number: { value: page.number?.value ?? "", label: e.target.value } })} />
        </div>
      )}
    </div>
  );
}
