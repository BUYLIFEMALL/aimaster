"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkCheck, EyeOff, ImagePlus, Loader2, Pencil, Plus, Search, Trash2, Type, Play, Zap } from "lucide-react";
import { BOARD_CATEGORIES, boardFromRows, filterPresets, MINE_DAYS, type BoardCategory, type BoardPresetRow, type MinePrompt } from "@/lib/promptBoard";
import { CAMERAS, STYLES } from "@/lib/presets";

const EMPTY: BoardPresetRow = { id: "", category: "nature", title: "", idea: "", styleId: STYLES[0].id, cameraId: CAMERAS[0].id, input: "text", sortOrder: 0, published: true };
const daysLeft = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

/** 3D 직관 카테고리 매핑 */
const CATEGORY_3D_EMOJI: Record<string, string> = {
  nature: "🌲",
  city: "🌃",
  people: "👤",
  product: "🛍️",
  fantasy: "🚀",
};

/** 헐리우드 네온 사이버 스튜디오 — 영상 프롬프트 게시판 */
export function PromptBoard() {
  const [tab, setTab] = useState<"presets" | "mine">("presets");
  const [category, setCategory] = useState<BoardCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [presets, setPresets] = useState<BoardPresetRow[]>(() => boardFromRows(null).presets);
  const [mine, setMine] = useState<MinePrompt[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editing, setEditing] = useState<BoardPresetRow | null>(null);
  const [saving, setSaving] = useState(false);
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
    `whitespace-nowrap rounded-xl border px-3.5 py-2 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
      on
        ? "border-pink-500/60 bg-gradient-to-r from-pink-500/30 to-purple-600/30 text-white shadow-lg shadow-pink-500/20"
        : "border-slate-800/80 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80 hover:text-white"
    }`;

  async function savePreset(p: BoardPresetRow, label = "저장하는 중") {
    setSaving(true); setError(""); setBusy({ id: p.id, label });
    try {
      const res = await fetch("/api/prompts/presets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(p) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "예시를 저장하지 못했습니다.");
      const saved = (j.preset ?? p) as BoardPresetRow;
      setPresets((cur) => (cur.some((x) => x.id === saved.id) ? cur.map((x) => (x.id === saved.id ? saved : x)) : [...cur, saved]));
      setEditing(null);
      void load();
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
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> {busy.label}…
      </span>
    );

  const input = "w-full rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500";

  const editor = editing && (
    <div className="space-y-3 rounded-2xl border border-amber-400/40 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-amber-300 flex items-center gap-2">
          <span>⚙️</span>
          {presets.some((p) => p.id === editing.id) ? "프롬프트 예시 수정" : "새 헐리우드 예시 추가"}
          <span className="font-normal text-xs text-slate-400">(관리자 전용 — 즉시 모든 회원 화면 반영)</span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
        <label className="text-[11px] font-bold text-slate-300">식별 ID(영문)<input className={input} value={editing.id} disabled={presets.some((p) => p.id === editing.id)} onChange={(e) => setEditing({ ...editing, id: e.target.value.toLowerCase() })} placeholder="cyber-tokyo-night" /></label>
        <label className="text-[11px] font-bold text-slate-300">장면 제목<input className={input} value={editing.title} maxLength={40} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></label>
        <label className="text-[11px] font-bold text-slate-300">카테고리 분류<select className={input} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value as BoardCategory })}>{BOARD_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="text-[11px] font-bold text-slate-300">노출 순서<input className={input} type="number" min={0} max={9999} value={editing.sortOrder} onChange={(e) => setEditing({ ...editing, sortOrder: Number(e.target.value) })} /></label>
      </div>
      <label className="block text-[11px] font-bold text-slate-300">시네마틱 장면 설명 (한국어로 디테일하게 작성)<textarea className={input} rows={3} maxLength={1200} value={editing.idea} onChange={(e) => setEditing({ ...editing, idea: e.target.value })} /></label>
      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-4">
        <label className="text-[11px] font-bold text-slate-300">추천 화풍<select className={input} value={editing.styleId} onChange={(e) => setEditing({ ...editing, styleId: e.target.value })}>{STYLES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
        <label className="text-[11px] font-bold text-slate-300">카메라 앵글<select className={input} value={editing.cameraId} onChange={(e) => setEditing({ ...editing, cameraId: e.target.value })}>{CAMERAS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
        <label className="text-[11px] font-bold text-slate-300">입력 방식<select className={input} value={editing.input} onChange={(e) => setEditing({ ...editing, input: e.target.value === "photo" ? "photo" : "text" })}><option value="text">글만으로 바로 제작</option><option value="photo">사진 1장 넣으면 더 좋음</option></select></label>
        <label className="flex items-center gap-2 pt-4 text-xs font-bold text-slate-200 cursor-pointer"><input type="checkbox" className="h-4 w-4 rounded accent-pink-500" checked={editing.published} onChange={(e) => setEditing({ ...editing, published: e.target.checked })} /> 회원에게 즉시 공개</label>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" disabled={saving} onClick={() => void savePreset(editing)} className="inline-flex items-center gap-1.5 rounded-xl bg-pink-500 px-4 py-2 text-xs font-bold text-white hover:bg-pink-600 shadow-md shadow-pink-500/20 disabled:opacity-50">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} {saving ? "저장 중…" : "설정 저장"}
        </button>
        <button type="button" disabled={saving} onClick={() => setEditing(null)} className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-400 hover:text-white">취소</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-16">
      {/* 헐리우드 사이버 스튜디오 히어로 헤더 */}
      <header className="relative overflow-hidden rounded-3xl border border-pink-500/30 bg-gradient-to-r from-slate-900/90 via-[#13182e]/90 to-slate-900/90 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 text-lg shadow-md shadow-pink-500/30">
                🎬
              </span>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                영상 프롬프트 시네마 보드
                <span className="rounded-full border border-pink-500/40 bg-pink-500/10 px-2.5 py-0.5 text-xs font-bold text-pink-300">
                  헐리우드 명장면 24선
                </span>
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-slate-300 max-w-3xl">
              어떤 영상을 만들지 고민할 필요 없이, 아래 명장면 카드에서 <span className="text-pink-300 font-bold">「▶ 이 장면으로 영상 만들기」</span>를 누르면 설명·화풍·카메라 앵글이 작업실에 자동 세팅됩니다. 초보자도 3초 만에 프로급 영상을 렌더링할 수 있습니다! (내 프롬프트는 ${MINE_DAYS}일간 보관)
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-2xl btn-cyber-primary px-4 py-2.5 text-xs font-black shadow-lg"
            >
              <Zap className="h-4 w-4" />
              <span>빈 작업실로 바로가기</span>
            </Link>
          </div>
        </div>

        {/* 탭 토글 바 */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-5">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="게시판 보기">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "presets"}
              onClick={() => setTab("presets")}
              className={chip(tab === "presets")}
            >
              <span className="text-sm">🎬</span>
              <span>추천 시네마 예시 ({presets.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "mine"}
              onClick={() => setTab("mine")}
              className={chip(tab === "mine")}
            >
              <span className="text-sm">🔖</span>
              <span>내가 보관한 프롬프트 ({mine ? mine.length : "…"})</span>
            </button>
            {isAdmin && tab === "presets" && !editing && (
              <button
                type="button"
                onClick={() => setEditing({ ...EMPTY, sortOrder: Math.max(0, ...presets.map((p) => p.sortOrder)) + 10 })}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/20"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" /> 관리자 예시 추가
              </button>
            )}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="장면 검색 (예: 바다, 네온, 드론, 비)"
              className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 py-2 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>
      </header>

      {/* 카테고리 필터 칩 바 */}
      {tab === "presets" && (
        <div className="flex flex-wrap items-center gap-2 p-1" role="group" aria-label="카테고리 필터">
          <button
            type="button"
            aria-pressed={category === "all"}
            onClick={() => setCategory("all")}
            className={chip(category === "all")}
          >
            <span>전체 명장면 ({count("all")})</span>
          </button>
          {BOARD_CATEGORIES.map((c) => {
            const emoji = CATEGORY_3D_EMOJI[c.id] || c.emoji;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={category === c.id}
                onClick={() => setCategory(c.id)}
                className={chip(category === c.id)}
              >
                <span className="text-sm">{emoji}</span>
                <span>{c.label} ({count(c.id)})</span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs font-bold text-rose-300">
          ⚠️ {error}
        </p>
      )}

      {tab === "presets" && editor}

      {/* 카드 그리드 영역 */}
      {tab === "presets" ? (
        shown.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-400">
            <p className="text-base font-bold text-slate-300">일치하는 시네마 장면이 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">다른 검색어를 입력하시거나 카테고리를 「전체」로 변경해 보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((p) => {
              const cat = BOARD_CATEGORIES.find((c) => c.id === p.category);
              const emoji = CATEGORY_3D_EMOJI[p.category] || cat?.emoji || "🎬";
              const styleLabel = STYLES.find((s) => s.id === p.styleId)?.label ?? "실사 영화";
              const cameraLabel = CAMERAS.find((c) => c.id === p.cameraId)?.label ?? "와이드 샷";

              return (
                <article
                  key={p.id}
                  data-preset={p.id}
                  className={`group relative flex flex-col justify-between rounded-3xl glass-cyber-card p-5 ${
                    p.published ? "" : "opacity-60"
                  }`}
                >
                  <div className="space-y-3.5">
                    {/* 카드 헤더: 뱃지 및 제목 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800/80 text-base shadow border border-slate-700/50">
                          {emoji}
                        </span>
                        <h2 className="text-base font-black tracking-tight text-white truncate group-hover:text-pink-300 transition-colors">
                          {p.title}
                        </h2>
                      </div>
                      <span className="shrink-0 whitespace-nowrap rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        {cat?.label}
                      </span>
                    </div>

                    {/* 본문 디테일 시나리오 설명 */}
                    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
                      <p className="text-xs leading-relaxed text-slate-200 line-clamp-4 font-medium">
                        {p.idea}
                      </p>
                    </div>

                    {/* 메타 스펙 뱃지 그룹 */}
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-bold">
                      <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-slate-300 flex items-center gap-1">
                        <span>🎨</span> 화풍: {styleLabel}
                      </span>
                      <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1 text-slate-300 flex items-center gap-1">
                        <span>🎥</span> {cameraLabel}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 ${
                          p.input === "photo"
                            ? "border border-amber-500/30 bg-amber-500/10 text-amber-300"
                            : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        }`}
                      >
                        {p.input === "photo" ? <ImagePlus className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                        {p.input === "photo" ? "📸 사진 넣으면 더 좋음" : "✍️ 글만으로 3초 완성"}
                      </span>
                      {!p.published && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-1 text-rose-300 border border-rose-500/30">
                          <EyeOff className="h-3 w-3" /> 숨김(관리자용)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 하단 액션 버튼 */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <Link
                      href={`/create?preset=${p.id}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl btn-cyber-primary py-2.5 px-3 text-xs font-black shadow-lg"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>이 장면으로 영상 만들기</span>
                    </Link>

                    {isAdmin && (
                      <div className="shrink-0 flex items-center gap-1">
                        {busy?.id === p.id ? (
                          busyBadge(p.id)
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => {
                                setEditing(p);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }}
                              className="p-2 rounded-lg text-amber-300 hover:bg-slate-800 transition-colors"
                              title="수정"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void savePreset({ ...p, published: !p.published }, p.published ? "숨기는 중" : "공개하는 중")}
                              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                              title={p.published ? "숨기기" : "공개"}
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : mine === null ? (
        <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-400 font-bold">
          <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
          <span>보관된 프롬프트를 불러오는 중입니다…</span>
        </div>
      ) : shownMine.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-800 p-12 text-center text-slate-400">
          <p className="text-base font-bold text-slate-300">아직 저장한 내 프롬프트가 없습니다.</p>
          <p className="mt-1 text-xs text-slate-500">
            <Link href="/create" className="font-bold text-pink-400 underline hover:text-pink-300">
              영상 생성 작업실
            </Link>
            에서 장면 설명을 작성한 뒤 「내 프롬프트로 저장」을 누르면 여기에 안전하게 보관됩니다.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shownMine.map((m) => (
            <article key={m.id} data-mine={m.id} className="flex flex-col justify-between rounded-3xl glass-cyber-card p-5">
              <div className="space-y-3">
                <header className="flex items-start justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-base font-black text-white">
                    <BookmarkCheck className="h-4 w-4 text-pink-400" />
                    <span>{m.title}</span>
                  </h2>
                  <span className="shrink-0 rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-400">
                    보관 D-{daysLeft(m.expiresAt)}
                  </span>
                </header>
                <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
                  <p className="text-xs leading-relaxed text-slate-200 font-medium">
                    {m.idea}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-400">
                  {m.styleId && <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1">화풍 · {STYLES.find((s) => s.id === m.styleId)?.label}</span>}
                  {m.cameraId && <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1">카메라 · {CAMERAS.find((c) => c.id === m.cameraId)?.label}</span>}
                </div>
              </div>
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                <Link
                  href={`/create?mine=${m.id}`}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl btn-cyber-primary py-2.5 px-3 text-xs font-black shadow-lg"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>이 설명으로 만들기</span>
                </Link>
                {busy?.id === m.id ? (
                  busyBadge(m.id)
                ) : (
                  <button
                    type="button"
                    disabled={!!busy}
                    onClick={() => void removeMine(m.id)}
                    className="p-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
