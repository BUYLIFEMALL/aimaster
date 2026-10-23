"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clapperboard, ImagePlus, Search, Type } from "lucide-react";
import { BOARD_CATEGORIES, BOARD_PRESETS, filterPresets, type BoardCategory } from "@/lib/promptBoard";
import { CAMERAS, STYLES } from "@/lib/presets";

/** 영상 프롬프트 게시판(v1.14) — 장면 예시를 골라 생성 화면으로 보낸다 */
export function PromptBoard() {
  const [category, setCategory] = useState<BoardCategory | "all">("all");
  const [query, setQuery] = useState("");
  const shown = useMemo(() => filterPresets(BOARD_PRESETS, category, query), [category, query]);
  const count = (c: BoardCategory | "all") => (c === "all" ? BOARD_PRESETS.length : BOARD_PRESETS.filter((p) => p.category === c).length);
  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-sky-500/50 bg-sky-500/15 text-sky-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"}`;

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-1 border-b border-zinc-800/80 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">📝 영상 프롬프트 게시판</h1>
        <p className="text-sm text-zinc-300">바로 쓸 수 있는 장면 설명을 골라 「이 설명으로 만들기」를 누르면 생성 작업실에 설명·화풍·카메라가 채워집니다. 그대로 만들거나 고쳐 쓰고, 「AI로 설명 다듬기」로 더 구체적으로 바꿀 수 있습니다.</p>
      </header>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="분류 거르기">
          <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={chip(category === "all")}>전체 {count("all")}</button>
          {BOARD_CATEGORIES.map((c) => (
            <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={chip(category === c.id)}>{c.emoji} {c.label} {count(c.id)}</button>
          ))}
        </div>
        <label className="relative block md:w-64">
          <span className="sr-only">장면 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 바다, 카페, 고양이"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
        </label>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">찾는 장면이 없습니다. 다른 낱말로 찾거나 분류를 「전체」로 바꿔 보세요.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => {
            const cat = BOARD_CATEGORIES.find((c) => c.id === p.category);
            return (
              <article key={p.id} data-preset={p.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                <header className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-bold text-white">{p.title}</h2>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">{cat?.emoji} {cat?.label}</span>
                </header>
                <p className="text-xs leading-relaxed text-zinc-300">{p.idea}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px]">
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">화풍 · {STYLES.find((s) => s.id === p.styleId)?.label}</span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">카메라 · {CAMERAS.find((c) => c.id === p.cameraId)?.label}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${p.input === "photo" ? "bg-amber-500/10 text-amber-200" : "bg-emerald-500/10 text-emerald-300"}`}>
                    {p.input === "photo" ? <ImagePlus className="h-3 w-3" aria-hidden="true" /> : <Type className="h-3 w-3" aria-hidden="true" />}
                    {p.input === "photo" ? "내 제품 사진을 넣으면 더 좋음" : "글만으로 가능"}
                  </span>
                </div>
                <Link href={`/create?preset=${p.id}`} className="mt-auto inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-sky-400">
                  <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" /> 이 설명으로 만들기
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
