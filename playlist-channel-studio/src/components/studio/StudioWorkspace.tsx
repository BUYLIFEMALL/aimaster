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

  if (loading) return <Loader2 className="animate-spin text-neutral-400" />;

  const inTitleStep = project && (!project.title || editingTitle);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">새 플레이리스트</h1>
        <p className="mt-1 text-sm text-neutral-500">장르 → 제목 → Suno 프롬프트·가사·유튜브 설명·썸네일 순서로 만듭니다. 결과는 내 프로젝트에 자동 저장됩니다.</p>
      </div>

      <ModelBar />
      <ErrorBox message={error} />

      {/* ① 장르 */}
      {!project && (
        <section className="space-y-4">
          <h2 className="text-sm font-bold text-neutral-900">① 장르를 선택하세요</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {GENRES.map((g) => (
              <button key={g.id} type="button" disabled={busy} onClick={() => startWithGenre(g.id)} className="rounded-2xl border border-neutral-200 bg-white p-4 text-left transition hover:border-indigo-400 hover:shadow-sm disabled:opacity-60">
                <span className="text-2xl">{g.emoji}</span>
                <p className="mt-2 text-sm font-bold text-neutral-900">{g.label}</p>
                <p className="text-[11px] text-neutral-400">{g.en}</p>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row">
            <input value={custom} onChange={(e) => setCustom(e.target.value.slice(0, 60))} onKeyDown={(e) => e.key === "Enter" && !busy && startWithGenre(custom)} placeholder="원하는 장르를 직접 입력 (예: 몽환적인 드림팝, 90년대 감성 R&B)" className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
            <PrimaryButton busy={busy} disabled={!custom.trim()} onClick={() => startWithGenre(custom)}><Sparkles size={15} />이 장르로 제목 만들기</PrimaryButton>
          </div>
          {busy && <p className="text-xs text-neutral-500">제목을 만드는 중입니다...</p>}
        </section>
      )}

      {/* ② 제목 */}
      {project && inTitleStep && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-neutral-900">② 제목을 선택하세요 <span className="font-normal text-neutral-400">· {genreLabel(project.genre)}</span></h2>
            <button type="button" onClick={regenTitles} disabled={busy} className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-60">
              {busy ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}제목 다시 만들기
            </button>
          </div>
          {project.titles.length === 0 && !busy && <p className="text-sm text-neutral-500">제목 후보가 없습니다. &apos;제목 다시 만들기&apos;를 눌러 주세요.</p>}
          <div className="grid gap-2">
            {project.titles.map((t) => {
              const p = parseTitle(t);
              return (
                <button key={t} type="button" onClick={() => { setPick(t); setCustom(""); }} className={`rounded-xl border p-3 text-left transition ${pick === t ? "border-indigo-600 bg-indigo-50" : "border-neutral-200 bg-white hover:border-indigo-300"}`}>
                  <p className="text-sm font-bold text-neutral-900">{p ? `${p.emoji} ${p.sentence}` : t}</p>
                  {p && <p className="mt-0.5 text-xs text-neutral-500">{p.k1} &amp; {p.k2}</p>}
                  <p className="mt-1 break-all font-mono text-[11px] text-neutral-400">{t}</p>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white p-4 sm:flex-row">
            <input value={custom} onChange={(e) => { setCustom(e.target.value); setPick(""); }} placeholder="직접 쓰기: playlist 🌙 새벽 감성 | Midnight & Chill" className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900" />
            <PrimaryButton busy={busy} disabled={!(pick || custom.trim())} onClick={() => confirmTitle(pick || custom)}>이 제목으로 계속</PrimaryButton>
          </div>
          {editingTitle && <button type="button" onClick={() => setEditingTitle(false)} className="text-xs text-neutral-500 underline">취소하고 돌아가기</button>}
        </section>
      )}

      {/* ③ 콘텐츠 */}
      {project && project.title && !editingTitle && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] text-indigo-700">{genreLabel(project.genre)}</p>
              <p className="break-words text-sm font-bold text-indigo-950">{project.title}</p>
            </div>
            <button type="button" onClick={() => { setEditingTitle(true); setPick(""); setCustom(""); }} className="inline-flex shrink-0 items-center gap-1 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs text-indigo-800 hover:bg-indigo-100"><Pencil size={13} />제목 변경</button>
          </div>

          <div role="tablist" className="flex flex-wrap gap-1 border-b border-neutral-200">
            {TABS.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} type="button" onClick={() => setTab(t.id)} className={`-mb-px rounded-t-lg border border-b-0 px-4 py-2 text-sm ${tab === t.id ? "border-neutral-200 bg-white font-bold text-indigo-700" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}>{t.label}</button>
            ))}
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
