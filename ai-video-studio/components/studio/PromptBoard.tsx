"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, Clapperboard, EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, Type } from "lucide-react";
import { BOARD_CATEGORIES, boardFromRows, filterPresets, MINE_DAYS, type BoardCategory, type BoardPresetRow, type MinePrompt } from "@/lib/promptBoard";
import { CAMERAS, STYLES } from "@/lib/presets";

const EMPTY: BoardPresetRow = { id: "", category: "nature", title: "", idea: "", styleId: STYLES[0].id, cameraId: CAMERAS[0].id, input: "text", sortOrder: 0, published: true };
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/** 영상 프롬프트 게시판 — v1.14 예시 고르기 + v1.19 A안(관리자 편집, 내 프롬프트 저장·본인만) */
export function PromptBoard() {
  const [tab, setTab] = useState<"presets" | "mine">("presets");
  const [category, setCategory] = useState<BoardCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [presets, setPresets] = useState<BoardPresetRow[]>(() => boardFromRows(null).presets);
  const [mine, setMine] = useState<MinePrompt[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<BoardPresetRow | null>(null);
  const [saving, setSaving] = useState(false);
  // 진행 중 표시 — 누른 카드(id)와 무엇을 하는 중인지. 응답이 오면 그 카드만 바로 바꾸고 목록은 뒤에서 다시 읽는다
  const [busy, setBusy] = useState<{ id: string; label: string } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await fetch("/api/prompts", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "게시판을 불러오지 못했습니다.");
      setPresets(j.presets ?? []);
      setMine(j.mine ?? []);
      setIsAdmin(!!j.isAdmin);
    } catch (e) {
      setMine([]);
      setError(e instanceof Error ? e.message : "게시판을 불러오지 못했습니다.");
    }
  }
  useEffect(() => { void load(); }, []);

  const shown = useMemo(() => filterPresets(presets, category, query), [presets, category, query]);
  const shownMine = useMemo(() => {
    const q = query.replace(/\s+/g, "").toLowerCase();
    return (mine ?? []).filter((m) => !q || `${m.title}${m.idea}`.replace(/\s+/g, "").toLowerCase().includes(q));
  }, [mine, query]);
  const count = (c: BoardCategory | "all") => (c === "all" ? presets.length : presets.filter((p) => p.category === c).length);
  const chip = (on: boolean) =>
    `whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-bold ${on ? "border-sky-500/50 bg-sky-500/15 text-sky-200" : "border-zinc-800 text-zinc-400 hover:text-zinc-200"}`;

  async function savePreset(p: BoardPresetRow, label = "저장하는 중") {
    setSaving(true); setError(""); setBusy({ id: p.id, label });
    try {
      const res = await fetch("/api/prompts/presets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "예시를 저장하지 못했습니다.");
      const saved = (j.preset ?? p) as BoardPresetRow;
      setPresets((cur) => (cur.some((x) => x.id === saved.id) ? cur.map((x) => (x.id === saved.id ? saved : x)) : [...cur, saved]));
      setEditing(null);
      void load(); // 순서 등 서버 기준으로 맞추기(뒤에서)
    } catch (e) {
      setError(e instanceof Error ? e.message : "예시를 저장하지 못했습니다.");
    } finally {
      setSaving(false); setBusy(null);
    }
  }

  async function removeMine(id: string) {
    setError(""); setBusy({ id, label: "지우는 중" });
    try {
      const res = await fetch(`/api/prompts/mine?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(j.error ?? "지우지 못했습니다."); return; }
      setMine((cur) => (cur ?? []).filter((m) => m.id !== id));
    } finally {
      setBusy(null);
    }
  }

  const busyBadge = (id: string) =>
    busy?.id === id && (
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-100">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {busy.label}…
      </span>
    );

  const input = "w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-2 py-1.5 text-xs text-zinc-100 focus:border-sky-500/60 focus:outline-none";
  const editor = editing && (
    <div className="space-y-2 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-4">
      <p className="text-sm font-bold text-amber-200">{presets.some((p) => p.id === editing.id) ? "예시 고치기" : "새 예시 추가"} <span className="font-normal text-zinc-400">(관리자만 보입니다 — 저장하면 모든 회원 게시판에 바로 반영)</span></p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <label className="text-[11px] text-zinc-400">id(영문)<input className={input} value={editing.id} disabled={presets.some((p) => p.id === editing.id)} onChange={(e) => setEditing({ ...editing, id: e.target.value.toLowerCase() })} placeholder="city-night-rain" /></label>
        <label className="text-[11px] text-zinc-400">제목<input className={input} value={editing.title} maxLength={40} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
        <label className="text-[11px] text-zinc-400">분류<select className={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as BoardCategory })}>{BOARD_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="text-[11px] text-zinc-400">순서(작을수록 앞)<input className={input} type="number" min={0} max={9999} value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></label>
      </div>
      <label className="block text-[11px] text-zinc-400">장면 설명(한국어, 사람은 한국인으로·브랜드·실존 인물·연도 없이)<textarea className={input} rows={3} maxLength={1200} value={editing.idea} onChange={(e) => setEditing({ ...editing, idea: e.target.value })} /></label>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
        <label className="text-[11px] text-zinc-400">화풍<select className={input} value={editing.styleId} onChange={(e) => setEditing({ ...editing, styleId: e.target.value })}>{STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label className="text-[11px] text-zinc-400">카메라<select className={input} value={editing.cameraId} onChange={(e) => setEditing({ ...editing, cameraId: e.target.value })}>{CAMERAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="text-[11px] text-zinc-400">입력<select className={input} value={editing.input} onChange={(e) => setEditing({ ...editing, input: e.target.value === "photo" ? "photo" : "text" })}><option value="text">글만으로 가능</option><option value="photo">사진 넣으면 더 좋음</option></select></label>
        <label className="flex items-end gap-1.5 pb-1.5 text-xs text-zinc-300"><input type="checkbox" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> 회원에게 공개</label>
      </div>
      <div className="flex gap-2">
        <button type="button" disabled={saving} onClick={() => void savePreset(editing)} className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-amber-300 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} {saving ? "저장하는 중…" : "저장"}
        </button>
        <button type="button" disabled={saving} onClick={() => setEditing(null)} className="text-xs text-zinc-400 hover:text-zinc-200">취소</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      <header className="space-y-1 border-b border-zinc-800/80 pb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">📝 영상 프롬프트 게시판</h1>
        <p className="text-sm text-zinc-300">바로 쓸 수 있는 장면 설명을 골라 「이 설명으로 만들기」를 누르면 생성 작업실에 설명·화풍·카메라가 채워집니다. 생성 작업실에서 「내 프롬프트로 저장」한 설명은 「내 프롬프트」 탭에 {MINE_DAYS}일 동안 보관됩니다(나만 보입니다).</p>
      </header>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="게시판 보기">
        <button type="button" role="tab" aria-selected={tab === "presets"} onClick={() => setTab("presets")} className={chip(tab === "presets")}>📚 예시 {presets.length}</button>
        <button type="button" role="tab" aria-selected={tab === "mine"} onClick={() => setTab("mine")} className={chip(tab === "mine")}>🔖 내 프롬프트 {mine ? mine.length : "…"}</button>
        {isAdmin && tab === "presets" && !editing && (
          <button type="button" onClick={() => setEditing({ ...EMPTY, sortOrder: (Math.max(0, ...presets.map((p) => p.sortOrder)) + 10) })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-amber-400/40 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/10">
            <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 새 예시 추가(관리자)
          </button>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {tab === "presets" ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="분류 거르기">
            <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")} className={chip(category === "all")}>전체 {count("all")}</button>
            {BOARD_CATEGORIES.map((c) => (
              <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={chip(category === c.id)}>{c.emoji} {c.label} {count(c.id)}</button>
            ))}
          </div>
        ) : <span />}
        <label className="relative block md:w-64">
          <span className="sr-only">장면 검색</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 바다, 카페, 고양이"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-950/60 py-2 pl-8 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500/60 focus:outline-none" />
        </label>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">{error}</p>}
      {tab === "presets" && editor}

      {tab === "presets" ? (
        shown.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">찾는 장면이 없습니다. 다른 낱말로 찾거나 분류를 「전체」로 바꿔 보세요.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => {
              const cat = BOARD_CATEGORIES.find((c) => c.id === p.category);
              return (
                <article key={p.id} data-preset={p.id} className={`flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 ${p.published ? "" : "opacity-60"}`}>
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
                    {!p.published && <span className="inline-flex items-center gap-1 rounded-full bg-zinc-700 px-2 py-0.5 text-zinc-200"><EyeOff className="h-3 w-3" aria-hidden="true" /> 숨김(관리자만 보임)</span>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-3">
                    <Link href={`/create?preset=${p.id}`} className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-sky-400">
                      <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" /> 이 설명으로 만들기
                    </Link>
                    {isAdmin && (busy?.id === p.id ? busyBadge(p.id) : (
                      <>
                        <button type="button" disabled={saving} onClick={() => { setEditing(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="inline-flex items-center gap-1 text-xs text-amber-200 hover:underline disabled:opacity-40"><Pencil className="h-3 w-3" aria-hidden="true" /> 편집</button>
                        <button type="button" disabled={saving} onClick={() => void savePreset({ ...p, published: !p.published }, p.published ? "숨기는 중" : "공개하는 중")} className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 disabled:opacity-40"><EyeOff className="h-3 w-3" aria-hidden="true" /> {p.published ? "숨기기" : "다시 공개"}</button>
                      </>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : mine === null ? (
        <p className="flex items-center gap-2 text-sm text-zinc-400"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> 불러오는 중</p>
      ) : shownMine.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-400">
          아직 저장한 프롬프트가 없습니다. <Link href="/create" className="font-bold text-sky-300 underline">영상 생성 작업실</Link>에서 설명을 쓰고 「내 프롬프트로 저장」을 누르면 여기에 모입니다.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shownMine.map((m) => (
            <article key={m.id} data-mine={m.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
              <header className="flex items-start justify-between gap-2">
                <h2 className="flex items-center gap-1 text-sm font-bold text-white"><BookmarkCheck className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" /> {m.title}</h2>
                <span className="shrink-0 whitespace-nowrap text-[10px] text-zinc-500">자동 삭제 D-{daysLeft(m.expiresAt)}</span>
              </header>
              <p className="text-xs leading-relaxed text-zinc-300">{m.idea}</p>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                {m.styleId && <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">화풍 · {STYLES.find((s) => s.id === m.styleId)?.label}</span>}
                {m.cameraId && <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-zinc-400">카메라 · {CAMERAS.find((c) => c.id === m.cameraId)?.label}</span>}
              </div>
              <div className="mt-auto flex items-center gap-3">
                <Link href={`/create?mine=${m.id}`} className="inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-bold text-zinc-950 hover:bg-sky-400">
                  <Clapperboard className="h-3.5 w-3.5" aria-hidden="true" /> 이 설명으로 만들기
                </Link>
                {busy?.id === m.id ? busyBadge(m.id) : (
                  <button type="button" disabled={!!busy} onClick={() => void removeMine(m.id)} className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-red-300 disabled:opacity-40"><Trash2 className="h-3 w-3" aria-hidden="true" /> 삭제</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
