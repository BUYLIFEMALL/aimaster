"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Wand2, Loader2, AlertCircle, ShieldAlert, Scissors, Palette, X } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, enqueueEdit, fetchLibraryFile, hasLibrary, hasQueue, hasYue2Cover, saveToLibrary, startEditTask, waitForTask, type EditOptions } from "@/lib/engine";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { LIMITS } from "@/lib/songs";
import { COVER_SOURCE_KEY, SOURCE_MAX_SEC, SOURCE_MIN_SEC, type CoverSource } from "@/lib/tracks";
import type { Collection } from "@/lib/collections";

// C-33(2026-11-09 주인님 「cover 카테고리에서 따로 관리할꺼야」): 만든 곡을 넣을 프로젝트 — 마지막에 고른 것을 기억, 처음엔 이름이 Cover인 프로젝트
const PROJECT_KEY = "fms.importProject";

const MAX_BYTES = 60 * 1024 * 1024; // 엔진 연결 문 업로드 상한
const field =
  "w-full rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-hidden focus:ring-1 focus:ring-emerald-400";
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s) % 60).padStart(2, "0")}`;

type Result = { id: string; title: string; url: string; ext: string; saved: boolean };

/** 원곡 파일 길이(초)를 브라우저에서 읽는다 — 파일은 서버로 보내지 않는다. */
function readDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const a = new Audio();
    a.preload = "metadata";
    a.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(a.duration);
    };
    a.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("음원 파일을 읽지 못했습니다. MP3·WAV·FLAC 파일인지 확인해 주세요."));
    };
    a.src = url;
  });
}

/**
 * 가져온 음악 — 회원 PC의 원곡 파일로 커버(스타일 바꾸기) 또는 일부만 다시 만들기(플랜 4단계).
 * 원곡 파일은 브라우저 → 회원 PC 엔진으로만 간다. 권리 확인을 해야 시작할 수 있다.
 */
export default function ImportPage() {
  const engine = useEngine();
  const { status, ready } = engine;
  const [file, setFile] = useState<File | null>(null);
  const [sourceSec, setSourceSec] = useState(0);
  const [mode, setMode] = useState<"cover" | "repaint">("cover");
  const [title, setTitle] = useState("");
  const [style, setStyle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [strength, setStrength] = useState(0.6);
  // 커버 엔진(엔진 0.8.0, B-5): ACE-Step = 원곡 소리를 바탕으로(상업용) / YuE2 = 원곡 멜로디를 악보로 받아 적어 새로 부름(비상업)
  const [coverEngine, setCoverEngine] = useState<"acestep" | "yue2">("acestep");
  const [projects, setProjects] = useState<Collection[]>([]);
  const [projectId, setProjectId] = useState("");
  useEffect(() => {
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { projects?: Collection[] } | null) => {
        const list = d?.projects ?? [];
        setProjects(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem(PROJECT_KEY);
        } catch {}
        if (saved !== null) setProjectId(saved === "" || list.some((p) => p.id === saved) ? saved : "");
        else setProjectId(list.find((p) => p.name.trim().toLowerCase() === "cover")?.id ?? "");
      })
      .catch(() => {});
  }, []);
  const pickProject = (id: string) => {
    setProjectId(id);
    try {
      localStorage.setItem(PROJECT_KEY, id);
    } catch {}
  };
  const [range, setRange] = useState<[number, number]>([0, 10]);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState<"" | "upload" | "run" | "fetch">("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const cancelled = useRef(false);
  const urls = useRef<string[]>([]);
  // 「모든 음악」의 「커버 →」로 온 경우: 원곡은 엔진 보관함 파일을 그대로 쓴다(원본 boks-music cover())
  const [source, setSource] = useState<CoverSource | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);

  useEffect(() => {
    const from = new URLSearchParams(window.location.search).get("from");
    if (!from) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(COVER_SOURCE_KEY) || "null") as CoverSource | null;
      if (saved?.id === from) setSource(saved);
    } catch {
      /* 저장 공간을 못 쓰면 파일 고르기로 */
    }
  }, []);

  const sourceReady = engine.paired && hasLibrary(status);
  useEffect(() => {
    if (!source || !sourceReady || file) return;
    let stop = false;
    setLoadingSource(true);
    (async () => {
      try {
        const { url, ext } = await fetchLibraryFile(source.id);
        const blob = await (await fetch(url)).blob();
        URL.revokeObjectURL(url);
        if (stop) return;
        await pick(new File([blob], `${source.title}.${ext}`, { type: blob.type }));
        setMode("cover");
        setTitle(`${source.title} · Cover`.slice(0, LIMITS.title));
        setStyle(source.style_prompt);
        setLyrics(source.lyrics);
        setRights(source.kind === "text2music"); // 이 프로그램으로 만든 곡은 회원 본인 곡
      } catch (e) {
        if (!stop) setError(e instanceof EngineError ? e.message : "보관함에서 원곡을 불러오지 못했습니다. 파일을 직접 골라 주세요.");
      } finally {
        if (!stop) setLoadingSource(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [source, sourceReady]); // eslint-disable-line react-hooks/exhaustive-deps -- 원곡이 정해질 때 한 번

  const clearSource = () => {
    setSource(null);
    setFile(null);
    setTitle("");
    try {
      sessionStorage.removeItem(COVER_SOURCE_KEY);
    } catch {}
    window.history.replaceState(null, "", "/import");
  };
  const nameOf = () => {
    const base = title.trim() || "가져온 음악";
    return (source && mode === "cover" ? base : `${base} (${mode === "cover" ? "커버" : "부분 수정"})`).slice(0, LIMITS.title);
  };

  useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    setElapsed(0);
    const t = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy === ""]); // eslint-disable-line react-hooks/exhaustive-deps -- 작업 한 번에 시계 하나

  const pick = async (f: File | null) => {
    setError(null);
    setFile(null);
    if (!f) return;
    if (f.size > MAX_BYTES) return setError("파일이 너무 큽니다. 60MB 이하 음원을 골라 주세요.");
    try {
      const sec = await readDuration(f);
      if (!Number.isFinite(sec) || sec < SOURCE_MIN_SEC || sec > SOURCE_MAX_SEC) {
        return setError(`${SOURCE_MIN_SEC}초~${SOURCE_MAX_SEC / 60}분 길이의 음원만 쓸 수 있습니다(이 파일 ${clock(sec || 0)}).`);
      }
      setFile(f);
      setSourceSec(sec);
      setRange([0, Math.min(10, Math.floor(sec))]);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, LIMITS.title - 6));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // 엔진 0.1.6+: 원곡을 엔진에 올려 대기열에 넣는다(엔진이 준비 중이어도 되고, 탭을 닫아도 계속 만든다)
  const queueMode = engine.paired && hasQueue(status);
  const yue2Cover = mode === "cover" && coverEngine === "yue2" && queueMode && hasYue2Cover(status);
  const canStart =
    (queueMode || (ready && hasLibrary(status))) && !!file && rights && !busy && (style.trim() || lyrics.trim()) && (mode === "cover" || range[1] > range[0]) && (!yue2Cover || !!lyrics.trim());
  const [queuedNote, setQueuedNote] = useState("");

  const start = async () => {
    if (!file || !status) return;
    setError(null);
    setQueuedNote("");
    setBusy("upload");
    try {
      const opts: EditOptions =
        mode === "cover"
          ? { mode, style_prompt: style, lyrics, strength }
          : { mode, style_prompt: style, lyrics, start: range[0], end: range[1] };
      if (queueMode) {
        const name = nameOf();
        await enqueueEdit(file, opts, sourceSec, { title: name, device: status.device, parentId: source?.id, engine: yue2Cover ? "yue2" : "acestep", projectId: projectId || null }, status.quality);
        setQueuedNote(`「${name}」 작업을 대기열에 넣었습니다. 엔진이 차례로 만들고, 다 되면 「모든 음악」에 저절로 기록됩니다.`);
        return;
      }
      const taskId = await startEditTask(file, opts, sourceSec, status.quality);
      setBusy("run");
      const out = await waitForTask(taskId, () => cancelled.current);
      setBusy("fetch");
      const name = nameOf();
      const id = crypto.randomUUID();
      await saveToLibrary(id, out, name);
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, song_id: null, title: name, style_prompt: style, lyrics, duration_sec: Math.round(sourceSec), device: status.device, kind: mode, parent_id: source?.id ?? null, ...(projectId ? { project_id: projectId } : {}) }),
      }).catch(() => null);
      const { url, ext } = await fetchLibraryFile(id);
      urls.current.push(url);
      setResults((r) => [{ id, title: name, url, ext, saved: !!res?.ok }, ...r]);
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "만들지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const stageText = busy === "upload" ? "원곡을 엔진에 올리는 중…" : busy === "run" ? "다시 만드는 중…" : busy === "fetch" ? "완성된 노래 받는 중…" : "";
  const tab = (active: boolean) =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-colors ${
      active ? "bg-emerald-600 text-white" : "border border-slate-700 text-slate-300 hover:bg-slate-900"
    }`;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Upload className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">📥 가져온 음악</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              내 PC의 음원 파일로 새 스타일 커버를 만들거나, 원하는 구간만 다시 만듭니다. 원곡 파일은 내 PC 엔진으로만 가고 서버에 올라가지 않습니다.
            </p>
          </div>
        </div>
      </div>

      {!engine.checking && !(ready && hasLibrary(status)) && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            내 PC 엔진이 연결되어 있어야 합니다(보관함이 있는 새 엔진).{" "}
            <Link href="/engine" className="font-semibold underline underline-offset-2">
              내 PC 엔진 화면
            </Link>
          </span>
        </p>
      )}

      <section className="space-y-4 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
        {/* 1. 원곡 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-200">1. 원곡 파일 고르기</p>
          {source ? (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-xs">
              {loadingSource ? <Loader2 className="h-5 w-5 shrink-0 animate-spin text-emerald-300" /> : <Palette className="h-5 w-5 shrink-0 text-emerald-300" />}
              <span className="min-w-0 flex-1">
                <span className="block text-[11px] text-emerald-300/80">원곡의 멜로디에서 시작 — 보관함 파일을 그대로 씁니다</span>
                <span className="block truncate font-semibold text-slate-100">
                  {source.title}
                  {file && !loadingSource ? ` · ${clock(sourceSec)}` : loadingSource ? " · 내 PC 보관함에서 불러오는 중…" : !sourceReady ? " · 엔진이 연결되면 불러옵니다" : ""}
                </span>
              </span>
              <button type="button" onClick={clearSource} disabled={!!busy} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-slate-200" aria-label="원곡 취소">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-950/60 p-4 text-xs text-slate-300 hover:border-emerald-500/60">
            <Upload className="h-5 w-5 text-emerald-300" />
            <span className="min-w-0 flex-1 truncate">
              {file ? `${file.name} · ${clock(sourceSec)} · ${(file.size / 1024 / 1024).toFixed(1)}MB` : `MP3·WAV·FLAC 파일 (${SOURCE_MIN_SEC}초~${SOURCE_MAX_SEC / 60}분, 60MB까지)`}
            </span>
            <span className="rounded-lg border border-slate-600 px-3 py-1.5 font-semibold">파일 고르기</span>
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          )}
        </div>

        {/* 2. 방식 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-200">2. 어떻게 다시 만들까요?</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode("cover")} className={tab(mode === "cover")}>
              <Palette className="h-4 w-4" /> 커버 (스타일 바꾸기)
            </button>
            <button type="button" onClick={() => setMode("repaint")} className={tab(mode === "repaint")}>
              <Scissors className="h-4 w-4" /> 일부만 다시 만들기
            </button>
          </div>
          {mode === "cover" && queueMode && hasYue2Cover(status) && (
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="커버 엔진">
              <span className="text-[11px] text-slate-400">커버 엔진</span>
              {(
                [
                  { id: "acestep", label: "ACE-Step · 원곡 소리 바탕", badge: "상업용", tone: "bg-emerald-500/20 text-emerald-200" },
                  { id: "yue2", label: "YuE2 · 원곡 멜로디 받아 적기", badge: "비상업용", tone: "bg-amber-500/20 text-amber-200" },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  role="radio"
                  aria-checked={coverEngine === o.id}
                  onClick={() => setCoverEngine(o.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${coverEngine === o.id ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-50" : "border-slate-700/60 text-slate-300 hover:border-slate-500"}`}
                >
                  {coverEngine === o.id ? "✓ " : ""}
                  {o.label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${o.tone}`}>{o.badge}</span>
                </button>
              ))}
            </div>
          )}
          {mode === "cover" && yue2Cover ? (
            <div className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-[11px] leading-relaxed text-amber-100/90">
              <p className="font-semibold text-amber-200">🎼 YuE2 커버 — 원곡의 노래 멜로디를 악보로 받아 적은 뒤, 그 멜로디로 새 가사·새 스타일을 부릅니다</p>
              <p>· <b>새로 부를 가사가 꼭 필요합니다.</b> 원곡과 글자 수·구간이 비슷할수록 멜로디에 잘 맞습니다([Verse]·[Chorus]로 원곡 구간에 맞춰 주세요).</p>
              <p>· 노래 소리가 또렷한 원곡일수록 잘 받아 적습니다. 받아 적기가 틀리면 커버에도 그대로 나옵니다. 5분 이하를 권장합니다.</p>
              <p>· <b>비상업용(CC BY-NC)</b> — 개인 감상·비수익 용도만. 처음 쓸 때 받아 적기 모델(약 1GB)을 받습니다.</p>
            </div>
          ) : mode === "cover" ? (
            <div className="space-y-1 rounded-xl bg-slate-950/50 p-3">
              <label className="flex items-center justify-between text-xs text-slate-300">
                원곡을 얼마나 따를까요? <span className="font-mono text-emerald-300">{Math.round(strength * 100)}%</span>
              </label>
              <input type="range" min={0.2} max={1} step={0.05} value={strength} onChange={(e) => setStrength(Number(e.target.value))} className="w-full accent-emerald-500" />
              <p className="text-[11px] text-slate-500">낮을수록 새 스타일이 강해지고, 높을수록 원곡의 멜로디·구성을 많이 따릅니다.</p>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl bg-slate-950/50 p-3 text-xs text-slate-300">
              <p>다시 만들 구간 (원곡 {clock(sourceSec || 0)})</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, Math.floor(sourceSec) - 1)}
                  value={range[0]}
                  onChange={(e) => setRange([Math.max(0, Number(e.target.value)), range[1]])}
                  className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                />
                초부터
                <input
                  type="number"
                  min={1}
                  max={Math.floor(sourceSec) || 1}
                  value={range[1]}
                  onChange={(e) => setRange([range[0], Math.min(Math.floor(sourceSec) || 1, Number(e.target.value))])}
                  className="w-24 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5"
                />
                초까지
              </div>
              <p className="text-[11px] text-slate-500">이 구간만 새 스타일·가사로 바뀌고 나머지는 원곡 그대로 남습니다.</p>
            </div>
          )}
        </div>

        {/* 3. 새 스타일·가사 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-slate-200">3. 새 스타일·가사</p>
          <div className="flex flex-wrap items-center gap-2">
            <input className={`${field} min-w-0 flex-1`} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="곡 제목" maxLength={LIMITS.title - 8} />
            <label className="flex shrink-0 items-center gap-1.5 text-[11px] text-slate-400">
              📁 넣을 프로젝트
              <select
                value={projectId}
                onChange={(e) => pickProject(e.target.value)}
                aria-label="넣을 프로젝트"
                title="완성된 곡이 「모든 음악」의 이 프로젝트에 들어갑니다(마지막에 고른 것을 기억)"
                className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-slate-200 focus:border-emerald-400 focus:outline-hidden"
              >
                <option value="">{source ? "원곡과 같은 프로젝트" : "프로젝트 없음"}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            className={`${field} min-h-[60px] font-mono text-xs`}
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="새 음악 스타일(Caption, 영어) 예) acoustic guitar ballad, soft female vocal"
            maxLength={LIMITS.style}
          />
          <textarea
            className={`${field} min-h-[140px] leading-relaxed`}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            // 2026-11-09 마스터PC 화면: YuE2 커버는 가사가 필수인데 「(선택)」으로 보이던 것
            placeholder={yue2Cover ? "새 가사(필수) — 원곡과 같은 구간·비슷한 글자 수로\n[Verse]\n첫 소절\n\n[Chorus]\n후렴" : "새 가사(선택) — 비워 두면 원곡 분위기대로\n[Verse]\n..."}
            maxLength={LIMITS.lyrics}
          />
        </div>

        {/* 4. 권리 확인 */}
        <label className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs leading-relaxed text-amber-100">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-0.5 accent-amber-500" />
          <span>
            <ShieldAlert className="mr-1 inline h-3.5 w-3.5 text-amber-300" />이 음원은 제가 직접 만들었거나 사용·편곡 권리를 가지고 있습니다. 남의 곡을 허락 없이 커버해 공개·판매하면 저작권 침해가 될 수 있으며, 책임은 저에게 있습니다.
          </span>
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}{" "}
            {busy ? stageText : `${mode === "cover" ? "커버 만들기" : "이 구간 다시 만들기"}${queueMode ? " (대기열에 넣기)" : ""}`}
          </button>
          {busy && <span className="font-mono text-xs text-teal-200">{clock(elapsed)} 지남</span>}
          {!busy && !rights && file && <span className="text-[11px] text-slate-500">권리 확인에 체크해야 시작할 수 있습니다.</span>}
          {/* 2026-11-09 마스터PC: YuE2 커버에 가사가 없어 버튼이 꺼졌는데 이유가 안 보이던 것 */}
          {!busy && rights && file && yue2Cover && !lyrics.trim() && <span className="text-[11px] font-semibold text-amber-300">YuE2 커버는 새 가사를 넣어야 시작할 수 있습니다(원곡 멜로디에 얹어 부를 가사).</span>}
          {!busy && rights && file && !style.trim() && !lyrics.trim() && !yue2Cover && <span className="text-[11px] text-slate-500">새 스타일이나 새 가사 중 하나를 넣어 주세요.</span>}
        </div>

        {error && (
          <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}
        {queuedNote && (
          <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-emerald-300">
            {queuedNote}
            <Link href="/queue" className="underline underline-offset-2">
              작업 대기열 보기
            </Link>
          </p>
        )}

        {results.map((r) => (
          <div key={r.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-100">{r.title}</span>
              <span className="ml-auto">
                <DownloadButtons trackId={r.id} title={r.title} ext={r.ext} ffmpeg={!!status?.quality?.ffmpeg} onError={setError} />
              </span>
            </div>
            <audio controls src={r.url} className="w-full" />
            <p className={`text-[11px] ${r.saved ? "text-emerald-300/80" : "text-amber-300/80"}`}>
              {r.saved ? (
                <>
                  ✔ 내 PC 저장 폴더에 저장했습니다 —{" "}
                  <Link href="/library" className="underline underline-offset-2">
                    모든 음악
                  </Link>
                  에서 다시 들을 수 있습니다.
                </>
              ) : (
                "음원은 저장 폴더에 있지만 목록 기록을 남기지 못했습니다. [내려받기]로 따로 저장해 두세요."
              )}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
