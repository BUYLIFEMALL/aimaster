"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Palette, Plus, X } from "lucide-react";
import { MY_PRESET_CATEGORY, PRESET_LIMITS, PRESET_PAGE_SIZE, pageCount, presetCategories, presetsFor, type PresetMode, type UserPreset } from "@/lib/presets";

const field =
  "rounded-xl border border-slate-700/60 bg-slate-950/80 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden";

/** 스타일 프리셋 — 분류 목록에서 고르거나 한 쪽 6개씩 넘겨 보며 누르면 스타일 칸이 채워진다. 지금 스타일을 「내 프리셋」으로 저장. */
/**
 * genre: 위 AI 작사에서 고른 장르(프리셋 분류 이름) — 있으면 카드에 그 장르(와 내 프리셋)만 보인다(2026-11-06, 장르를 한 번만 고르게).
 * onGenre: 프리셋을 고르면 그 프리셋의 장르를 위로 알린다(내 프리셋은 장르를 바꾸지 않음).
 */
export function PresetPicker({ mode, style, onPick, genre = "", onGenre }: { mode: PresetMode; style: string; onPick: (prompt: string) => void; genre?: string; onGenre?: (category: string) => void }) {
  const [mine, setMine] = useState<UserPreset[]>([]);
  const [chosen, setChosen] = useState("");
  const [page, setPage] = useState(0);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const loadMine = useCallback(() => {
    fetch("/api/presets")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.presets && setMine(d.presets))
      .catch(() => {});
  }, []);
  useEffect(loadMine, [loadMine]);
  useEffect(() => {
    setPage(0);
    setChosen("");
  }, [mode]);

  const list = useMemo(() => presetsFor(mode, mine), [mode, mine]);
  const categories = useMemo(() => presetCategories(list), [list]);
  // 카드는 고른 장르만(내 프리셋은 늘 함께), 드롭다운은 전체 그대로
  const cards = useMemo(() => (genre && categories.includes(genre) ? list.filter((p) => p.category === genre || p.category === MY_PRESET_CATEGORY) : list), [list, categories, genre]);
  useEffect(() => setPage(0), [genre]);
  const pages = pageCount(cards.length);
  const shown = Math.min(page, pages - 1);

  const pick = (id: string) => {
    const p = list.find((x) => x.id === id);
    if (!p) return;
    setChosen(id);
    onPick(p.prompt);
    if (p.category !== MY_PRESET_CATEGORY) onGenre?.(p.category);
  };

  const save = async () => {
    setNote(null);
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, prompt: style, mode }),
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (!res?.ok) {
      setNote({ ok: false, text: data?.error || "프리셋을 저장하지 못했습니다." });
      return;
    }
    setMine((m) => [...m, data.preset]);
    setChosen(`my:${data.preset.id}`);
    setPage(0);
    setNaming(false);
    setName("");
    setNote({ ok: true, text: `내 프리셋 저장 완료: ${data.preset.name}` });
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/presets/${id}`, { method: "DELETE" }).catch(() => null);
    if (res?.ok) {
      const gone = mine.find((p) => p.id === id);
      setMine((m) => m.filter((p) => p.id !== id));
      if (chosen === `my:${id}`) setChosen("");
      setNote({ ok: true, text: `내 프리셋 지움: ${gone?.name ?? ""}` });
    } else setNote({ ok: false, text: "프리셋을 지우지 못했습니다." });
  };

  return (
    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
          <Palette className="h-3.5 w-3.5 text-emerald-300" /> 스타일 프리셋
          <span className="font-normal text-slate-500">
            {mode === "instrumental" ? "연주곡용" : "노래용"} {cards === list ? `${list.length}개` : `「${genre}」 ${cards.length}개 / 전체 ${list.length}개`}
          </span>
        </span>
        <select
          aria-label="프리셋 고르기"
          className={`${field} min-w-0 flex-1`}
          value={list.some((p) => p.id === chosen) ? chosen : ""}
          onChange={(e) => {
            pick(e.target.value);
            // 드롭다운으로 고르면 장르가 그 프리셋 장르로 바뀌므로, 바뀐 카드 목록 기준으로 쪽을 찾는다
            const p = list.find((x) => x.id === e.target.value);
            const after = p && p.category !== MY_PRESET_CATEGORY ? list.filter((x) => x.category === p.category || x.category === MY_PRESET_CATEGORY) : cards;
            const i = after.findIndex((x) => x.id === e.target.value);
            if (i >= 0) setPage(Math.floor(i / PRESET_PAGE_SIZE));
          }}
        >
          <option value="">분류에서 고르기</option>
          {categories.map((c) => (
            <optgroup key={c} label={c}>
              {list
                .filter((p) => p.category === c)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.description}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          disabled={!style.trim()}
          onClick={() => setNaming((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40"
          title={style.trim() ? "지금 스타일 칸 내용을 저장합니다" : "스타일 칸을 먼저 채워 주세요"}
        >
          <Plus className="h-3.5 w-3.5" /> 내 프리셋으로 저장
        </button>
      </div>

      {naming && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            autoFocus
            className={`${field} min-w-0 flex-1`}
            value={name}
            maxLength={PRESET_LIMITS.name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && save()}
            placeholder="프리셋 이름 예) 비 오는 날 시티팝"
          />
          <button type="button" disabled={!name.trim()} onClick={save} className="rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white hover:brightness-110 disabled:opacity-40">
            저장
          </button>
          <button type="button" onClick={() => setNaming(false)} className="rounded-lg px-2 py-2 text-[11px] text-slate-400 hover:text-slate-200">
            취소
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="이전 프리셋"
          disabled={shown === 0}
          onClick={() => setPage(shown - 1)}
          className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-900 disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-3">
          {cards.slice(shown * PRESET_PAGE_SIZE, shown * PRESET_PAGE_SIZE + PRESET_PAGE_SIZE).map((p) => {
            const own = p.category === MY_PRESET_CATEGORY;
            return (
              <div key={p.id} className="relative">
                <button
                  type="button"
                  title={`${p.name} · ${p.description}\n${p.prompt}`}
                  onClick={() => pick(p.id)}
                  className={`w-full truncate rounded-lg border px-2.5 py-2 text-left text-[11px] font-semibold transition-colors ${
                    chosen === p.id
                      ? "border-emerald-400 bg-emerald-950/60 text-emerald-200"
                      : own
                        ? "border-amber-500/30 bg-amber-950/20 text-amber-200 hover:bg-amber-950/40"
                        : "border-slate-700/70 text-slate-300 hover:bg-slate-900"
                  } ${own ? "pr-6" : ""}`}
                >
                  {own ? "⭐ " : ""}
                  {p.name}
                  <span className="block truncate text-[10px] font-normal text-slate-500">{p.description}</span>
                </button>
                {own && (
                  <button
                    type="button"
                    aria-label={`${p.name} 지우기`}
                    onClick={() => remove(p.id.slice(3))}
                    className="absolute right-1 top-1 rounded p-0.5 text-slate-500 hover:bg-rose-950/60 hover:text-rose-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="다음 프리셋"
          disabled={shown >= pages - 1}
          onClick={() => setPage(shown + 1)}
          className="rounded-lg border border-slate-700 p-1.5 text-slate-300 hover:bg-slate-900 disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <p className="flex flex-wrap justify-between gap-2 text-[10px] text-slate-500">
        <span aria-live="polite">
          {shown + 1} / {pages} 쪽
        </span>
        {note ? <span className={note.ok ? "text-emerald-300" : "text-rose-300"}>{note.text}</span> : <span>누르면 아래 스타일 칸이 바뀝니다. 고친 뒤 저장할 수 있습니다.</span>}
      </p>
    </div>
  );
}
