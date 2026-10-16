"use client";

import { useEffect, useState } from "react";
import { Loader2, Pencil, RefreshCw, Sparkles } from "lucide-react";
import { GENRES, genreLabel, type ProjectContent, type ThumbSettings } from "@/lib/playlist/types";
import { parseTitle } from "@/lib/playlist/validate";
import { ErrorBox, ModelBar, PrimaryButton } from "./common";
import { LyricsTab, MetaTab, SunoTab } from "./ContentTabs";
import { ThumbnailTab, type ThumbData } from "./ThumbnailTab";
import { AiProvider, useAi } from "./useAi";

interface Project {
  id: string;
  genre: string;
  title: string | null;
  titles: string[];
  content: ProjectContent;
  status: "created" | "titled" | "content";
  thumbUrl: string | null;
  thumbSettings: Partial<ThumbSettings> | null;
  thumbPrompt: string | null;
}

type Tab = "suno" | "lyrics" | "meta" | "thumb";
const TABS: { id: Tab; label: string }[] = [
  { id: "suno", label: "Suno 프롬프트" },
  { id: "lyrics", label: "가사" },
  { id: "meta", label: "유튜브 메타데이터" },
  { id: "thumb", label: "썸네일" },
];

export function StudioWorkspace({ projectId }: { projectId?: string }) {
  return (
    <AiProvider>
      <Inner projectId={projectId} />
    </AiProvider>
  );
}

function Inner({ projectId }: { projectId?: string }) {
  const { generate } = useAi();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(!!projectId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [custom, setCustom] = useState("");
  const [pick, setPick] = useState<string>("");
  const [editingTitle, setEditingTitle] = useState(false);
  const [tab, setTab] = useState<Tab>("suno");

  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.project) setProject(d.project);
        else setError(d.error ?? "프로젝트를 불러오지 못했습니다.");
      })
      .catch(() => setError("네트워크 오류가 발생했습니다."))
      .finally(() => setLoading(false));
  }, [projectId]);

  /** 장르를 정하면 프로젝트를 만들고 곧바로 제목 10개를 요청한다 */
  async function startWithGenre(genre: string) {
    const g = genre.trim();
    if (!g) return setError("장르를 선택하거나 입력해 주세요.");
    setBusy(true);
    setError(null);
    const res = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ genre: g }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      return setError(d.error ?? "프로젝트를 만들지 못했습니다.");
    }
    const created: Project = { id: d.id, genre: g, title: null, titles: [], content: {}, status: "created", thumbUrl: null, thumbSettings: null, thumbPrompt: null };
    setProject(created);
    window.history.replaceState(null, "", `/studio?p=${d.id}`);
    const t = await generate(d.id, "titles");
    setBusy(false);
    if (t.error) return setError(`${t.error} (프로젝트는 저장되어 있으니 '제목 다시 만들기'로 이어서 할 수 있습니다.)`);
    setProject({ ...created, titles: t.titles as string[], status: "titled" });
  }

  async function regenTitles() {
    if (!project) return;
    setBusy(true);
    setError(null);
    const t = await generate(project.id, "titles");
    setBusy(false);
    if (t.error) return setError(t.error);
    setProject({ ...project, titles: t.titles as string[] });
    setPick("");
  }

  async function confirmTitle(title: string) {
    if (!project) return;
    const t = title.trim();
    if (!t) return setError("제목을 선택하거나 입력해 주세요.");
    if (project.title && project.title !== t && !confirm("제목을 바꾸면 지금까지 만든 Suno 프롬프트·가사·설명·썸네일이 지워집니다. 계속할까요?")) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/projects/${project.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: t }) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !d.project) return setError(d.error ?? "저장하지 못했습니다.");
    setProject({ ...project, ...d.project });
    setEditingTitle(false);
    setTab("suno");
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-cyan-400" /></div>;

  const inTitleStep = project && (!project.title || editingTitle);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">새 플레이리스트</h1>
        <p className="mt-1 text-sm text-slate-400">장르 → 제목 → Suno 프롬프트·가사·유튜브 설명·썸네일 순서로 만듭니다. 결과는 내 프로젝트에 자동 저장됩니다.</p>
      </div>

      <ModelBar />
      <ErrorBox message={error} />

      {/* ① 장르 */}
      {!project && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-slate-200">① 장르를 선택하세요</h2>
          {(["base", "extra"] as const).map((group) => (
            <div key={group}>
              <p className="mb-2 text-xs font-medium text-slate-400">{group === "base" ? "기본 장르" : "추천 장르"}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {GENRES.filter((g) => g.group === group).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    disabled={busy}
                    onClick={() => startWithGenre(g.id)}
                    className="group rounded-2xl border border-slate-800/80 bg-[#0d1322] p-4 text-left transition hover:border-cyan-500/50 hover:bg-[#12192e] hover:shadow-[0_0_15px_rgba(6,182,212,0.15)] disabled:opacity-60"
                  >
                    <span className="text-2xl transition-transform group-hover:scale-110 inline-block">{g.emoji}</span>
                    <p className="mt-2 text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">{g.label}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{g.en}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-[#0d1322] p-4 sm:flex-row">
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.slice(0, 60))}
              onKeyDown={(e) => e.key === "Enter" && !busy && startWithGenre(custom)}
              placeholder="원하는 장르를 직접 입력 (예: 몽환적인 드림팝, 90년대 감성 R&B)"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#131b2e] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <PrimaryButton busy={busy} disabled={!custom.trim()} onClick={() => startWithGenre(custom)}><Sparkles size={15} />이 장르로 제목 만들기</PrimaryButton>
          </div>
          {busy && <p className="text-xs text-cyan-400 animate-pulse">제목을 만드는 중입니다...</p>}
        </section>
      )}

      {/* ② 제목 */}
      {project && inTitleStep && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">② 제목을 선택하세요 <span className="font-normal text-slate-400">· {genreLabel(project.genre)}</span></h2>
            <button
              type="button"
              onClick={regenTitles}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 size={13} className="animate-spin text-cyan-400" /> : <RefreshCw size={13} />}제목 다시 만들기
            </button>
          </div>
          {project.titles.length === 0 && !busy && <p className="text-sm text-slate-400">제목 후보가 없습니다. &apos;제목 다시 만들기&apos;를 눌러 주세요.</p>}
          <div className="grid gap-2.5">
            {project.titles.map((t) => {
              const p = parseTitle(t);
              const isSelected = pick === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setPick(t); setCustom(""); }}
                  className={`rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? "border-cyan-500 bg-cyan-950/30 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "border-slate-800/80 bg-[#0d1322] hover:border-cyan-500/40 hover:bg-[#12192e]"
                  }`}
                >
                  <p className={`text-sm font-bold ${isSelected ? "text-cyan-300" : "text-white"}`}>{p ? `${p.emoji} ${p.sentence}` : t}</p>
                  {p && <p className="mt-0.5 text-xs text-slate-400">{p.k1} &amp; {p.k2}</p>}
                  <p className="mt-1 break-all font-mono text-[11px] text-cyan-400/70">{t}</p>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-[#0d1322] p-4 sm:flex-row">
            <input
              value={custom}
              onChange={(e) => { setCustom(e.target.value); setPick(""); }}
              placeholder="직접 쓰기: playlist 🌙 새벽 감성 | Midnight & Chill"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-[#131b2e] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
            <PrimaryButton busy={busy} disabled={!(pick || custom.trim())} onClick={() => confirmTitle(pick || custom)}>이 제목으로 계속</PrimaryButton>
          </div>
          {editingTitle && <button type="button" onClick={() => setEditingTitle(false)} className="text-xs text-slate-400 hover:text-slate-200 underline">취소하고 돌아가기</button>}
        </section>
      )}

      {/* ③ 콘텐츠 */}
      {project && project.title && !editingTitle && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 px-5 py-4 shadow-sm">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-cyan-400">{genreLabel(project.genre)}</p>
              <p className="break-words text-base font-bold text-white mt-0.5">{project.title}</p>
            </div>
            <button
              type="button"
              onClick={() => { setEditingTitle(true); setPick(""); setCustom(""); }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-[#0d1322] px-3.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-950/40 transition-colors"
            >
              <Pencil size={13} />제목 변경
            </button>
          </div>

          <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-800 pb-0">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px rounded-t-xl px-4 py-2.5 text-sm transition-all ${
                    active
                      ? "border border-b-0 border-slate-800 bg-[#0d1322] font-bold text-cyan-300 shadow-[0_-2px_10px_rgba(6,182,212,0.1)]"
                      : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {tab === "suno" && <SunoTab projectId={project.id} genre={project.genre} content={project.content} onContent={(c) => setProject((p) => p && { ...p, content: { ...p.content, ...c } })} />}
          {tab === "lyrics" && <LyricsTab projectId={project.id} genre={project.genre} content={project.content} onContent={(c) => setProject((p) => p && { ...p, content: { ...p.content, ...c } })} />}
          {tab === "meta" && <MetaTab projectId={project.id} genre={project.genre} content={project.content} onContent={(c) => setProject((p) => p && { ...p, content: { ...p.content, ...c } })} />}
          {tab === "thumb" && (
            <ThumbnailTab
              projectId={project.id}
              genre={project.genre}
              title={project.title}
              data={{ thumbUrl: project.thumbUrl, thumbPrompt: project.thumbPrompt, thumbSettings: project.thumbSettings }}
              onData={(d: ThumbData) => setProject((p) => p && { ...p, ...d })}
            />
          )}
        </section>
      )}
    </div>
  );
}
