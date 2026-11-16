"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColorPreset } from "@/lib/builder/templates";

// 디자인 빌더 D5-7 — 템플릿 갤러리(업종 거르기 · 색 고르기 · 내 상품으로 미리보기)
// 썸네일은 그림 파일 대신 레이아웃 모양을 색으로 그린 작은 도식(템플릿을 늘려도 그림을 따로 만들 필요 없음)

type LayoutCard = {
  id: string; name: string; description: string; industries: string[]; moods: string[]; defaultColor: string;
  shape: { radius: string; button: string; image_ratio: string; mode?: string };
};

const RATIO: Record<string, string> = { "1:1": "1 / 1", "4:5": "4 / 5", "3:4": "3 / 4", "4:3": "4 / 3" };
const RADIUS: Record<string, string> = { none: "0", sm: "3px", md: "5px", lg: "7px", xl: "9px" };

/** 라디오 묶음 키보드(FRONT-20261117-01) — 좌우·상하 화살표는 돌아가며, Home/End는 처음·끝. 해당 키가 아니면 null */
function radioKeyIndex(key: string, i: number, n: number): number | null {
  if (key === "ArrowRight" || key === "ArrowDown") return (i + 1) % n;
  if (key === "ArrowLeft" || key === "ArrowUp") return (i - 1 + n) % n;
  if (key === "Home") return 0;
  if (key === "End") return n - 1;
  return null;
}

/** 레이아웃 모양 도식 — 띠·헤더·블록 줄을 고른 색으로 */
function Thumb({ layout, color }: { layout: LayoutCard; color: ColorPreset }) {
  const card = (n: number, plain: boolean) => (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className={plain ? "" : "rounded-[3px] border border-slate-200 bg-white p-0.5"}>
          <div style={{ aspectRatio: RATIO[layout.shape.image_ratio] ?? "1 / 1", background: "#e2e8f0", borderRadius: RADIUS[layout.shape.radius] }} />
          <div className="mt-0.5 h-1 w-3/4 rounded bg-slate-300" />
        </div>
      ))}
    </div>
  );
  const rows: Record<string, React.ReactNode> = {
    "clean-wellness": <><div className="mx-auto h-2 w-2/5 rounded bg-emerald-400" />{card(4, false)}<div className="flex gap-1 justify-center"><span className="h-1.5 w-8 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-8 rounded-full bg-slate-200" /></div>{card(4, false)}</>,
    "luxury-boutique": <><div className="mx-auto h-2 w-1/2 rounded bg-amber-500" />{card(3, true)}<div className="mx-auto h-1 w-1/3 rounded bg-slate-400" />{card(4, true)}</>,
    "trendy-pop": <><div className="rounded-md border p-1" style={{ borderColor: "#ea580c" }}>{card(4, false)}</div><div className="flex gap-1"><span className="h-1.5 w-5 rounded bg-orange-400" /><span className="h-1.5 w-5 rounded bg-slate-300" /></div>{card(4, false)}</>,
    "neo-modern": <>{card(4, false)}<div className="h-3 rounded bg-white" />{card(3, false)}</>,
    "clean-select": <><div className="mx-auto h-2 w-1/2 rounded bg-slate-400" />{card(4, true)}<div className="-mx-2 bg-white px-2 py-1.5">{card(3, true)}</div></>,
    "market-daily": <><div className="rounded border-2 p-1" style={{ borderColor: "#f43f5e" }}>{card(4, false)}</div><div className="flex gap-1"><span className="h-2 w-6 rounded" style={{ background: color.primary }} /><span className="h-2 w-6 rounded bg-slate-300" /></div>{card(4, false)}</>,
    "editorial-magazine": <><div className="-mx-2 bg-stone-100 px-2 py-2.5"><div className="mx-auto h-1 w-1/4 bg-slate-400" /><div className="mx-auto mt-1 h-2.5 w-3/5 bg-slate-700" /></div>{card(4, true)}</>,
    "minimal-showroom": <><div className="-mx-2 grid grid-cols-[1.3fr_1fr] items-center gap-2 bg-white px-2 py-2"><div><div className="h-2 w-4/5 rounded-sm bg-slate-600" /><div className="mt-1 h-2 w-3/5 rounded-sm" style={{ background: color.primary }} /></div><div className="h-6 rounded-sm bg-slate-200" /></div>{card(3, false)}</>,
    "street-night": <><div className="-mx-2 bg-stone-900 px-2 py-2"><div className="h-2 w-3/5 rounded bg-stone-200" /><div className="mt-1 h-2 w-2/5 rounded" style={{ background: color.primary }} /></div><div className="overflow-hidden">{card(4, false)}</div></>,
    "brand-story": <><div className="-mx-2 bg-white px-2 py-2"><div className="mx-auto h-2 w-2/3 rounded bg-slate-500" /><div className="mx-auto mt-1 h-1 w-4/5 rounded bg-slate-300" /></div>{card(3, false)}</>,
    "kids-toy": <><div className="mx-auto h-2 w-1/2 rounded-full bg-amber-400" />{card(4, false)}<div className="flex gap-1 justify-center"><span className="h-1.5 w-6 rounded-full bg-amber-300" /><span className="h-1.5 w-6 rounded-full bg-orange-300" /></div>{card(4, false)}</>,
    "digital-tech": <><div className="mx-auto h-1.5 w-3/5 rounded bg-blue-500" />{card(5, false)}<div className="flex gap-1"><span className="h-1.5 w-6 rounded bg-slate-400" /><span className="h-1.5 w-6 rounded bg-slate-200" /></div>{card(5, false)}</>,
    "wholesale-catalog": <><div className="h-2 w-full rounded bg-blue-100" />{card(5, true)}<div className="h-2 w-full rounded bg-slate-100" />{card(5, true)}</>,
    // D5+ 2차 125~130(templates-extra-2.ts)
    "fresh-market": <><div className="-mx-2 bg-green-50 px-2 py-2"><div className="h-2 w-1/2 rounded bg-green-700" /><div className="mt-1 h-2 w-1/3 rounded" style={{ background: color.primary }} /></div><div className="rounded border-2 border-rose-400 p-1">{card(4, false)}</div><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-6 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-6 rounded-sm bg-slate-300" /></div>{card(4, false)}</>,
    "bakery-cafe": <><div className="-mx-2 bg-amber-50 px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-full bg-amber-800" /><div className="mx-auto mt-1 h-1 w-2/3 rounded bg-amber-300" /></div><div className="grid grid-cols-4 gap-1"><div className="col-span-2 row-span-2 rounded-lg bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="rounded-lg bg-slate-200" style={{ aspectRatio: "4 / 5" }} />)}</div></>,
    "premium-deli": <><div className="-mx-2 bg-stone-900 px-2 py-2"><div className="h-2 w-1/2 rounded-sm bg-stone-200" /><div className="mt-1 h-2 w-2/5 rounded-sm" style={{ background: color.primary }} /></div><div className="overflow-hidden">{card(3, false)}</div><div className="h-2 rounded-sm bg-stone-700" /></>,
    "kids-pastel": <><div className="-mx-2 bg-pink-50 px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-full bg-pink-300" /><div className="mx-auto mt-1 h-2 w-2/5 rounded-full" style={{ background: color.primary }} /></div>{card(4, false)}<div className="flex justify-center gap-1"><span className="h-1.5 w-5 rounded-full bg-pink-300" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /></div></>,
    "mom-baby-care": <><div className="-mx-2 bg-orange-50 px-2 py-2"><div className="mx-auto h-2 w-1/2 rounded bg-slate-500" /><div className="mx-auto mt-1 h-1 w-3/4 rounded bg-slate-300" /></div><div className="grid grid-cols-4 gap-1"><div className="col-span-2 row-span-2 rounded-md bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="rounded-md bg-slate-200" style={{ aspectRatio: "1 / 1" }} />)}</div></>,
    "color-cosmetic": <><div className="-mx-2 bg-purple-50 px-2 py-2"><div className="h-2 w-1/2 rounded bg-purple-900" /><div className="mt-1 h-2 w-2/5 rounded" style={{ background: color.primary }} /></div><div className="overflow-hidden">{card(4, true)}</div><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-4 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-4 rounded-sm bg-slate-300" /><span className="h-1.5 w-4 rounded-sm bg-slate-300" /><span className="h-1.5 w-4 rounded-sm bg-slate-300" /></div></>,
    // D5+ 3차 131~138(templates-extra-3.ts)
    "meal-kit-kitchen": <><div className="-mx-2 bg-orange-50 px-2 py-2"><div className="h-2 w-1/2 rounded bg-orange-800" /><div className="mt-1 h-2 w-2/5 rounded" style={{ background: color.primary }} /></div><div className="grid grid-cols-3 gap-1"><div className="col-span-2 row-span-2 rounded-md bg-slate-200" />{[0, 1].map((i) => <div key={i} className="rounded-md bg-slate-200" style={{ aspectRatio: "4 / 3" }} />)}</div><div className="flex gap-1"><span className="h-1.5 w-6 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-6 rounded-full bg-slate-200" /><span className="h-1.5 w-6 rounded-full bg-slate-200" /></div></>,
    "tea-house": <><div className="-mx-2 bg-emerald-50 px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-sm bg-emerald-900" /><div className="mx-auto mt-1 h-1 w-2/3 rounded-sm bg-emerald-300" /></div><div className="overflow-hidden">{card(4, true)}</div><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-6 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-6 rounded-sm bg-slate-300" /><span className="h-1.5 w-6 rounded-sm bg-slate-300" /></div></>,
    "snack-pop": <><div className="-mx-2 bg-red-50 px-2 py-2.5"><div className="mx-auto h-2.5 w-1/2 rounded bg-red-800" /><div className="mx-auto mt-1 h-2 w-2/5 rounded" style={{ background: color.primary }} /></div><div className="rounded border-2 border-rose-400 p-1">{card(4, false)}</div><div className="flex justify-center gap-1"><span className="h-1.5 w-5 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /></div></>,
    "butcher-dark": <><div className="-mx-2 bg-stone-900 px-2 py-2"><div className="h-2.5 w-3/5 rounded-sm bg-stone-200" /><div className="mt-1 h-2 w-2/5 rounded-sm" style={{ background: color.primary }} /></div><div className="flex gap-2 border-b border-stone-700 pb-0.5"><span className="h-1.5 w-5 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-sm bg-stone-600" /><span className="h-1.5 w-5 rounded-sm bg-stone-600" /><span className="h-1.5 w-5 rounded-sm bg-stone-600" /></div>{card(3, false)}<div className="rounded border-2 border-rose-400 p-1">{card(3, false)}</div></>,
    "gadget-lab": <><div className="-mx-2 bg-blue-50 px-2 py-2"><div className="h-2 w-1/2 rounded bg-blue-900" /><div className="mt-1 h-2 w-1/3 rounded" style={{ background: color.primary }} /></div><div className="grid grid-cols-4 gap-1"><div className="col-span-2 row-span-2 rounded bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="rounded bg-slate-200" style={{ aspectRatio: "4 / 3" }} />)}</div><div className="flex gap-1"><span className="h-3 flex-1 rounded border border-slate-200 bg-white" /><span className="h-3 flex-1 rounded border border-slate-200 bg-white" /></div></>,
    "gaming-gear-dark": <><div className="-mx-2 bg-[#120f1f] px-2 py-2"><div className="h-2.5 w-3/5 rounded-sm bg-violet-200" /><div className="mt-1 h-2 w-2/5 rounded-sm" style={{ background: color.primary }} /></div><div className="rounded border-2 border-rose-400 p-1">{card(4, false)}</div><div className="overflow-hidden">{card(4, false)}</div></>,
    "smart-home": <><div className="-mx-2 bg-slate-100 px-2 py-2"><div className="mx-auto h-2 w-1/2 rounded bg-slate-600" /><div className="mx-auto mt-1 h-1 w-3/4 rounded bg-slate-300" /></div><div className="flex justify-center gap-1"><span className="h-1.5 w-6 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-6 rounded-full bg-slate-200" /><span className="h-1.5 w-6 rounded-full bg-slate-200" /></div><div className="-mx-2 grid grid-cols-4 gap-1 bg-white px-2 py-1"><div className="col-span-2 row-span-2 rounded-md bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="rounded-md bg-slate-200" style={{ aspectRatio: "1 / 1" }} />)}</div></>,
    "it-office-bulk": <><div className="-mx-2 bg-indigo-50 px-2 py-1.5"><div className="h-2 w-2/3 rounded-sm bg-blue-900" /><div className="mt-1 h-1 w-4/5 rounded-sm bg-slate-300" /></div><div className="h-1 w-full bg-slate-300" /><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-5 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /></div>{card(5, true)}</>,
    // D5+ 4차 139~144(templates-extra-4.ts)
    "daily-look": <><div className="-mx-2 bg-rose-50 px-2 py-2"><div className="h-2 w-1/2 rounded bg-rose-900" /><div className="mt-1 h-2 w-2/5 rounded" style={{ background: color.primary }} /></div><div className="grid grid-cols-4 gap-1"><div className="col-span-2 row-span-2 rounded-md bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="rounded-md bg-slate-200" style={{ aspectRatio: "3 / 4" }} />)}</div><div className="flex gap-1"><span className="h-1.5 w-5 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /></div></>,
    "uniform-order": <><div className="-mx-2 bg-indigo-50 px-2 py-1.5"><div className="h-2 w-2/3 rounded-sm bg-blue-900" /><div className="mt-1 h-1 w-4/5 rounded-sm bg-slate-300" /></div><div className="h-1 w-full bg-slate-300" /><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-5 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /></div>{card(4, true)}</>,
    "skincare-routine": <><div className="-mx-2 bg-emerald-50 px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-full bg-emerald-800" /><div className="mx-auto mt-1 h-2 w-2/5 rounded-full" style={{ background: color.primary }} /></div><div className="flex justify-center gap-1"><span className="h-1.5 w-5 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /></div>{card(4, false)}<div className="-mx-2 overflow-hidden bg-white px-2 py-1">{card(4, false)}</div></>,
    "hair-body-salon": <><div className="-mx-2 bg-[#faf5ef] px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-sm bg-[#5c3a21]" /><div className="mx-auto mt-1 h-1 w-2/3 rounded-sm bg-amber-200" /></div><div className="grid grid-cols-4 gap-1"><div className="col-span-2 row-span-2 bg-slate-200" />{[0, 1, 2, 3].map((i) => <div key={i} className="bg-slate-200" style={{ aspectRatio: "4 / 5" }} />)}</div><div className="flex gap-2 border-b border-slate-200 pb-0.5"><span className="h-1.5 w-5 rounded-sm" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /><span className="h-1.5 w-5 rounded-sm bg-slate-300" /></div></>,
    "perfume-noir": <><div className="-mx-2 bg-[#140f1f] px-2 py-2"><div className="h-2.5 w-3/5 rounded-none bg-violet-200" /><div className="mt-1 h-2 w-2/5 rounded-none" style={{ background: color.primary }} /></div><div className="flex gap-2 border-b border-stone-700 pb-0.5"><span className="h-1.5 w-5" style={{ background: color.primary }} /><span className="h-1.5 w-5 bg-stone-600" /><span className="h-1.5 w-5 bg-stone-600" /><span className="h-1.5 w-5 bg-stone-600" /></div>{card(4, true)}<div className="rounded border-2 border-rose-400 p-1">{card(4, true)}</div></>,
    "kids-closet": <><div className="-mx-2 bg-pink-50 px-2 py-2.5"><div className="mx-auto h-2 w-1/2 rounded-full bg-pink-800" /><div className="mx-auto mt-1 h-2 w-2/5 rounded-full" style={{ background: color.primary }} /></div><div className="flex justify-center gap-1"><span className="h-1.5 w-5 rounded-full" style={{ background: color.primary }} /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /><span className="h-1.5 w-5 rounded-full bg-slate-200" /></div><div className="rounded-lg border-2 border-rose-400 p-1">{card(4, false)}</div></>,
  };
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ background: layout.shape.mode === "dark" ? "#0c0a09" : color.bg }} aria-hidden>
      <div className="h-1.5" style={{ background: "#111827" }} />
      <div className="flex items-center justify-between bg-white px-2 py-1.5">
        <span className="h-3 w-3 rounded" style={{ background: color.primary }} />
        <span className="h-1.5 w-1/3 rounded bg-slate-200" />
        <span className="h-2.5 w-6" style={{ background: color.primary, borderRadius: RADIUS[layout.shape.radius] }} />
      </div>
      <div className="space-y-1.5 p-2">{rows[layout.id] ?? card(4, false)}</div>
    </div>
  );
}

export default function TemplateGallery({ slug, layouts, colors, industries }: {
  slug: string; layouts: LayoutCard[]; colors: ColorPreset[]; industries: { id: string; label: string }[];
}) {
  const [industry, setIndustry] = useState("");
  const [picked, setPicked] = useState<Record<string, string>>({});
  const shown = useMemo(() => (industry ? layouts.filter((l) => l.industries.includes(industry)) : layouts), [industry, layouts]);
  const label = Object.fromEntries(industries.map((i) => [i.id, i.label]));

  return (
    <div className="mt-4">
      {/* 업종 거르기 — 누른 단추 하나가 켜지는 토글 단추(aria-pressed). 단추 목록은 그대로라 거른 뒤에도 초점이 누른 단추에 남는다 */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="업종으로 거르기" data-industry-filter>
        {[{ id: "", label: "전체" }, ...industries].map((i) => (
          <button
            key={i.id || "all"}
            type="button"
            aria-pressed={industry === i.id}
            onClick={() => setIndustry(i.id)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${industry === i.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {i.label}
          </button>
        ))}
      </div>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-template-list>
        {shown.map((l) => {
          const colorId = picked[l.id] ?? l.defaultColor;
          const color = colors.find((c) => c.id === colorId) ?? colors[0]; // 이 아래 선택 표시·Tab·테두리·주소는 모두 실제로 보이는 color.id 하나로(기본색이 목록에 없을 때 어긋남 방지)
          return (
            <li key={l.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm" data-template={l.id}>
              <Thumb layout={l} color={color} />
              <h2 className="mt-3 text-sm font-bold text-gray-900">{l.name}</h2>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-600">{l.description}</p>
              <p className="mt-2 flex flex-wrap gap-1 text-[11px]">
                {l.industries.map((i) => <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{label[i]}</span>)}
                {l.moods.map((m) => <span key={m} className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">#{m}</span>)}
              </p>
              {/* 색 고르기 — 카드마다 고른 색 하나만 Tab으로 들어가고(나머지 tabIndex -1) 화살표·Home/End로 바로 고른다(초점도 함께 이동) */}
              <div
                className="mt-3 flex flex-wrap gap-1.5"
                role="radiogroup"
                aria-label={`${l.name} 색`}
                data-color-group
                onKeyDown={(e) => {
                  const at = colors.findIndex((c) => c.id === color.id);
                  const next = radioKeyIndex(e.key, at < 0 ? 0 : at, colors.length);
                  if (next === null) return;
                  e.preventDefault();
                  setPicked((p) => ({ ...p, [l.id]: colors[next].id }));
                  (e.currentTarget.querySelectorAll<HTMLButtonElement>("[role=radio]")[next])?.focus();
                }}
              >
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={c.id === color.id}
                    tabIndex={c.id === color.id ? 0 : -1}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setPicked((p) => ({ ...p, [l.id]: c.id }))}
                    className={`h-6 w-6 rounded-full border-2 ${c.id === color.id ? "border-gray-900" : "border-white ring-1 ring-gray-200"}`}
                    style={{ background: c.primary }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-500">색: {color.name}</p>
              <Link
                href={`/s/${slug}/admin/design?template=${encodeURIComponent(l.id)}&color=${encodeURIComponent(color.id)}`}
                className="mt-3 rounded-lg bg-gray-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-gray-800"
                data-template-preview-link
              >
                내 상품으로 미리보기
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
