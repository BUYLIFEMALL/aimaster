"use client";

// v1.56: 장르 칩 선택기 — Suno 공식 장르 225개 + 기존 칩을 검색·대분류 탭으로 고른다(빠른 기획·생성 콘솔·곡 카드 공용).
import { useMemo, useState } from "react";
import { TagChips } from "@/components/plannings/TagChips";
import { GENRE_OPTIONS, GENRE_MAX_SELECT, POPULAR_GENRES } from "@/lib/constants";
import { GENRE_FAMILIES } from "@/lib/sunoGenres";

export function GenrePicker({
  selected,
  onToggle,
  max = GENRE_MAX_SELECT,
}: {
  selected: string[];
  onToggle: (value: string) => void;
  max?: number;
}) {
  const [tab, setTab] = useState("popular");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return GENRE_OPTIONS.filter((o) => `${o.label} ${o.value}`.toLowerCase().includes(q));
    if (tab === "popular") return GENRE_OPTIONS.filter((o) => POPULAR_GENRES.includes(o.value));
    if (tab === "all") return GENRE_OPTIONS;
    return GENRE_OPTIONS.filter((o) => o.family === tab);
  }, [tab, query]);

  // 고른 장르는 탭·검색과 상관없이 항상 위에 보이게
  const pickedOutside = GENRE_OPTIONS.filter((o) => selected.includes(o.value) && !shown.includes(o));

  const tabs = [
    { id: "popular", label: "⭐ 자주 쓰는" },
    { id: "all", label: `전체 ${GENRE_OPTIONS.length}` },
    ...GENRE_FAMILIES.map((f) => ({ id: f.id, label: f.label })),
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="장르 검색 (예: 재즈, bossa, 트로트, phonk)"
          className="input text-xs flex-1 min-w-[200px]"
          aria-label="장르 검색"
        />
        <span className="text-[11px] text-zinc-500 whitespace-nowrap">
          {selected.length}/{max}개 선택 · Suno 공식 장르 기준
        </span>
      </div>
      {!query.trim() && (
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="장르 대분류">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-md px-2 py-1 text-[11px] font-bold whitespace-nowrap border ${
                tab === t.id
                  ? "border-orange-500/60 bg-orange-500/20 text-orange-200"
                  : "border-[#2c2c3a] bg-[#16161f] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      {pickedOutside.length > 0 && (
        <TagChips options={pickedOutside} selected={selected} max={max} onToggle={onToggle} />
      )}
      <div className="max-h-56 overflow-y-auto pr-1">
        {shown.length ? (
          <TagChips options={shown} selected={selected} max={max} onToggle={onToggle} />
        ) : (
          <p className="text-[11px] text-zinc-500">
            찾는 장르가 목록에 없습니다. 곡 설명에 적으면 AI가 Style에 넣습니다.
          </p>
        )}
      </div>
    </div>
  );
}
