"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Upload, Wand2, Loader2, AlertCircle, ShieldAlert, Scissors, Palette } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, fetchLibraryFile, hasLibrary, saveToLibrary, startEditTask, waitForTask, type EditOptions } from "@/lib/engine";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { LIMITS } from "@/lib/songs";
import { SOURCE_MAX_SEC, SOURCE_MIN_SEC } from "@/lib/tracks";

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
  const [range, setRange] = useState<[number, number]>([0, 10]);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState<"" | "upload" | "run" | "fetch">("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const cancelled = useRef(false);
  const urls = useRef<string[]>([]);

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

  const canStart = ready && hasLibrary(status) && !!file && rights && !busy && (style.trim() || lyrics.trim()) && (mode === "cover" || range[1] > range[0]);

  const start = async () => {
    if (!file || !status) return;
    setError(null);
    setBusy("upload");
    try {
      const opts: EditOptions =
        mode === "cover"
          ? { mode, style_prompt: style, lyrics, strength }
          : { mode, style_prompt: style, lyrics, start: range[0], end: range[1] };
      const taskId = await startEditTask(file, opts, sourceSec, status.quality);
      setBusy("run");
      const out = await waitForTask(taskId, () => cancelled.current);
      setBusy("fetch");
      const name = `${title.trim() || "가져온 음악"} (${mode === "cover" ? "커버" : "부분 수정"})`.slice(0, LIMITS.title);
      const id = crypto.randomUUID();
      await saveToLibrary(id, out, name);
      const res = await fetch("/api/tracks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, song_id: null, title: name, style_prompt: style, lyrics, duration_sec: Math.round(sourceSec), device: status.device, kind: mode }),
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
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-slate-600 bg-slate-950/60 p-4 text-xs text-slate-300 hover:border-emerald-500/60">
            <Upload className="h-5 w-5 text-emerald-300" />
            <span className="min-w-0 flex-1 truncate">
              {file ? `${file.name} · ${clock(sourceSec)} · ${(file.size / 1024 / 1024).toFixed(1)}MB` : `MP3·WAV·FLAC 파일 (${SOURCE_MIN_SEC}초~${SOURCE_MAX_SEC / 60}분, 60MB까지)`}
            </span>
            <span className="rounded-lg border border-slate-600 px-3 py-1.5 font-semibold">파일 고르기</span>
            <input type="file" accept="audio/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
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
          {mode === "cover" ? (
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
          <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="곡 제목" maxLength={LIMITS.title - 8} />
          <textarea
            className={`${field} min-h-[60px] font-mono text-xs`}
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            placeholder="새 스타일(영어 태그) 예) acoustic guitar ballad, soft female vocal"
            maxLength={LIMITS.style}
          />
          <textarea
            className={`${field} min-h-[140px] leading-relaxed`}
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder={"새 가사(선택) — 비워 두면 원곡 분위기대로\n[Verse]\n..."}
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
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {busy ? stageText : mode === "cover" ? "커버 만들기" : "이 구간 다시 만들기"}
          </button>
          {busy && <span className="font-mono text-xs text-teal-200">{clock(elapsed)} 지남</span>}
          {!busy && !rights && file && <span className="text-[11px] text-slate-500">권리 확인에 체크해야 시작할 수 있습니다.</span>}
        </div>

        {error && (
          <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
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
