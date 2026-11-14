"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ColorPreset } from "@/lib/builder/templates";

// 디자인 빌더 D5-7 — 템플릿 갤러리(업종 거르기 · 색 고르기 · 내 상품으로 미리보기)
// 썸네일은 그림 파일 대신 레이아웃 모양을 색으로 그린 작은 도식(템플릿을 늘려도 그림을 따로 만들 필요 없음)

type LayoutCard = {
  id: string; name: string; description: string; industries: string[]; moods: string[]; defaultColor: string;
  shape: { radius: string; button: string; image_ratio: string };
};

const RATIO: Record<string, string> = { "1:1": "1 / 1", "4:5": "4 / 5", "3:4": "3 / 4", "4:3": "4 / 3" };
const RADIUS: Record<string, string> = { none: "0", sm: "3px", md: "5px", lg: "7px", xl: "9px" };

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
    "neo-modern": <>{card(4, false)}<div className="h-3 rounded bg-white" />{card(3, false)}</>,
    "clean-select": <><div className="mx-auto h-2 w-1/2 rounded bg-slate-400" />{card(4, true)}<div className="-mx-2 bg-white px-2 py-1.5">{card(3, true)}</div></>,
    "market-daily": <><div className="rounded border-2 p-1" style={{ borderColor: "#f43f5e" }}>{card(4, false)}</div><div className="flex gap-1"><span className="h-2 w-6 rounded" style={{ background: color.primary }} /><span className="h-2 w-6 rounded bg-slate-300" /></div>{card(4, false)}</>,
    "brand-story": <><div className="-mx-2 bg-white px-2 py-2"><div className="mx-auto h-2 w-2/3 rounded bg-slate-500" /><div className="mx-auto mt-1 h-1 w-4/5 rounded bg-slate-300" /></div>{card(3, false)}</>,
  };
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200" style={{ background: color.bg }} aria-hidden>
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
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="업종" data-industry-filter>
        {[{ id: "", label: "전체" }, ...industries].map((i) => (
          <button
            key={i.id || "all"}
            type="button"
            role="radio"
            aria-checked={industry === i.id}
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
          const color = colors.find((c) => c.id === colorId) ?? colors[0];
          return (
            <li key={l.id} className="flex flex-col rounded-xl border border-gray-200 bg-white p-3 shadow-sm" data-template={l.id}>
              <Thumb layout={l} color={color} />
              <h2 className="mt-3 text-sm font-bold text-gray-900">{l.name}</h2>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-600">{l.description}</p>
              <p className="mt-2 flex flex-wrap gap-1 text-[11px]">
                {l.industries.map((i) => <span key={i} className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{label[i]}</span>)}
                {l.moods.map((m) => <span key={m} className="rounded bg-violet-50 px-1.5 py-0.5 text-violet-700">#{m}</span>)}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${l.name} 색`}>
                {colors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={c.id === colorId}
                    aria-label={c.name}
                    title={c.name}
                    onClick={() => setPicked((p) => ({ ...p, [l.id]: c.id }))}
                    className={`h-6 w-6 rounded-full border-2 ${c.id === colorId ? "border-gray-900" : "border-white ring-1 ring-gray-200"}`}
                    style={{ background: c.primary }}
                  />
                ))}
              </div>
              <p className="mt-1 text-[11px] text-gray-500">색: {color.name}</p>
              <Link
                href={`/s/${slug}/admin/design?template=${encodeURIComponent(l.id)}&color=${encodeURIComponent(colorId)}`}
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
