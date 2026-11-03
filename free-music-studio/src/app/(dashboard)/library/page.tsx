"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Library, Play, Download, Trash2, Search, AlertCircle, HardDrive, Loader2, ChevronDown, FolderOpen } from "lucide-react";
import { useEngine } from "@/components/engine/useEngine";
import {
  EngineError,
  deleteFromLibrary,
  fetchLibraryAudio,
  hasFolderPicker,
  hasLibrary,
  listLibrary,
  revealLibraryFolder,
} from "@/lib/engine";
import type { Track } from "@/lib/tracks";

const DEVICE_LABEL: Record<string, string> = { cuda: "그래픽카드", mps: "Apple 맥", cpu: "CPU" };
const durationLabel = (s: number) => (s < 60 ? `${s}초` : `${s / 60}분`);

export default function LibraryPage() {
  const engine = useEngine();
  const libOk = engine.paired && hasLibrary(engine.status);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [onPc, setOnPc] = useState<Set<string> | null>(null);
  const [query, setQuery] = useState("");
  const [audio, setAudio] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const urls = useRef<string[]>([]);

  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/tracks");
      const data = await res.json();
      if (res.ok) setTracks(data.tracks ?? []);
      else setMessage(data.error || "목록을 불러오지 못했습니다.");
    } catch {
      setMessage("목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // 엔진이 연결되면 이 PC 보관함에 어떤 곡이 있는지 한 번 확인한다.
  useEffect(() => {
    if (!libOk) return;
    listLibrary()
      .then(setOnPc)
      .catch(() => setOnPc(null));
  }, [libOk, tracks.length]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? tracks.filter((t) => `${t.title} ${t.style_prompt} ${t.lyrics}`.toLowerCase().includes(q)) : tracks;
  }, [tracks, query]);

  const loadAudio = async (id: string) => {
    if (audio[id]) return audio[id];
    setBusy(id);
    setMessage(null);
    try {
      const url = await fetchLibraryAudio(id);
      urls.current.push(url);
      setAudio((a) => ({ ...a, [id]: url }));
      return url;
    } catch (e) {
      setMessage(e instanceof EngineError ? e.message : "음원을 불러오지 못했습니다.");
      return null;
    } finally {
      setBusy(null);
    }
  };

  const download = async (t: Track) => {
    const url = await loadAudio(t.id);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.title}.mp3`;
    a.click();
  };

  const remove = async (t: Track) => {
    const here = onPc?.has(t.id);
    if (!confirm(here ? `「${t.title}」을 목록과 이 PC 보관함에서 지울까요? 되돌릴 수 없습니다.` : `「${t.title}」을 목록에서 지울까요?`)) return;
    setBusy(t.id);
    setMessage(null);
    try {
      if (here) await deleteFromLibrary(t.id);
      const res = await fetch(`/api/tracks/${t.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setTracks((list) => list.filter((x) => x.id !== t.id));
    } catch (e) {
      setMessage(e instanceof EngineError ? e.message : "지우지 못했습니다.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <Library className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">🎧 모든 음악</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              내 PC 엔진으로 만든 노래가 모두 모입니다. 음원 파일은 회원님 PC 보관함에 있고, 목록 기록은 30일 동안 보관됩니다.
            </p>
          </div>
          <span className="text-xs text-slate-400">총 {tracks.length}곡</span>
        </div>
      </div>

      {!engine.checking && !libOk && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs leading-relaxed text-amber-200">
          <HardDrive className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            {!engine.online
              ? "내 PC 엔진이 꺼져 있어 음원을 들을 수 없습니다. 엔진을 켜면 바로 들을 수 있습니다."
              : !engine.paired
                ? "이 브라우저를 엔진과 연결해야 음원을 들을 수 있습니다."
                : "지금 엔진은 보관함이 없는 옛 버전입니다. 엔진을 새로 받아 실행해 주세요."}{" "}
            <Link href="/engine" className="font-semibold underline underline-offset-2">
              내 PC 엔진 화면
            </Link>
          </span>
        </p>
      )}
      {libOk && engine.status?.libraryDir && (
        <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          💾 저장 폴더: <span className="break-all font-mono">{engine.status.libraryDir}</span>
          {hasFolderPicker(engine.status) && (
            <button
              type="button"
              onClick={() => revealLibraryFolder().catch(() => setMessage("폴더를 열지 못했습니다."))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1 text-slate-300 hover:bg-slate-900"
            >
              <FolderOpen className="h-3.5 w-3.5" /> 폴더 열기
            </button>
          )}
          <Link href="/engine" className="underline underline-offset-2">
            폴더 바꾸기
          </Link>
        </p>
      )}

      {message && (
        <p className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {message}
        </p>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="제목·스타일·가사로 찾기"
          className="w-full bg-transparent py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-hidden"
        />
      </div>

      {loading ? (
        <p className="text-xs text-slate-500">불러오는 중…</p>
      ) : shown.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-[#0a0f1d] p-8 text-center text-xs text-slate-400">
          {tracks.length === 0 ? (
            <>
              아직 만든 노래가 없습니다.{" "}
              <Link href="/songs" className="font-semibold text-emerald-300 underline underline-offset-2">
                곡 만들기
              </Link>
              에서 첫 노래를 만들어 보세요.
            </>
          ) : (
            "찾는 노래가 없습니다."
          )}
        </div>
      ) : (
        <ul className="space-y-2">
          {shown.map((t) => {
            const here = onPc ? onPc.has(t.id) : null;
            return (
              <li key={t.id} className="space-y-2 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-100">{t.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {durationLabel(t.duration_sec)} · {DEVICE_LABEL[t.device] ?? t.device} · {new Date(t.created_at).toLocaleString("ko-KR")}
                      {here === false && <span className="text-amber-300/80"> · 이 PC에 음원 없음(다른 PC에서 만들었거나 지운 곡)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => loadAudio(t.id)}
                      disabled={!libOk || here === false || busy === t.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-950/50 disabled:opacity-40"
                    >
                      {busy === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />} 듣기
                    </button>
                    <button
                      type="button"
                      onClick={() => download(t)}
                      disabled={!libOk || here === false || busy === t.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-40"
                    >
                      <Download className="h-3.5 w-3.5" /> MP3
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(open === t.id ? null : t.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-400 hover:bg-slate-900"
                      aria-label="가사·스타일 보기"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open === t.id ? "rotate-180" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      disabled={busy === t.id}
                      className="inline-flex items-center rounded-lg border border-rose-500/30 px-2.5 py-1.5 text-rose-300 hover:bg-rose-950/50 disabled:opacity-40"
                      aria-label="지우기"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {audio[t.id] && <audio controls autoPlay src={audio[t.id]} className="w-full" />}
                {open === t.id && (
                  <div className="space-y-1 rounded-xl bg-slate-950/60 p-3 text-xs text-slate-300">
                    {t.style_prompt && <p className="font-mono text-[11px] text-teal-300/80">{t.style_prompt}</p>}
                    <p className="whitespace-pre-wrap leading-relaxed">{t.lyrics || "(가사 없음)"}</p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
