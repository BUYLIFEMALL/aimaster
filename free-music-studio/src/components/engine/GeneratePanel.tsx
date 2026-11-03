"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cpu, Loader2, AlertCircle, Wand2 } from "lucide-react";
import { useEngine } from "./useEngine";
import { DownloadButtons } from "./DownloadButtons";
import {
  EngineError,
  checkTask,
  fetchAudio,
  fetchLibraryFile,
  hasLibrary,
  saveToLibrary,
  startTask,
  type SongForEngine,
} from "@/lib/engine";

type Take = { id: string; trackId: string | null; ext: string; title: string; url: string; seconds: number; at: string; saved: "saved" | "record-failed" | "old-engine" };

const POLL_MS = 3000;
const MAX_WAIT_MS = 45 * 60_000; // CPU 모드 4분 곡 + 첫 모델 내려받기까지 여유

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** 대략 걸리는 시간 — 2026-11-03 측정(CPU 30초 곡 약 90초, 3분 곡 약 371초). 그래픽카드는 훨씬 빠르다. */
function estimate(device: string, durationSec: number) {
  if (device === "cpu") return `약 ${Math.max(2, Math.round((durationSec * 2.1) / 60))}분`;
  return "1분 안팎";
}

/** 곡 만들기 화면 아래 칸 — 지금 편집 중인 가사·스타일로 내 PC 엔진에 노래를 맡긴다. */
export function GeneratePanel({ song, title, songId }: { song: SongForEngine; title: string; songId: string | null }) {
  const engine = useEngine();
  const { status, checking, online, paired, ready } = engine;
  const [busy, setBusy] = useState<"" | "start" | "run" | "fetch">("");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<{ text: string; needPair?: boolean } | null>(null);
  const [takes, setTakes] = useState<Take[]>([]);
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
  }, [busy === ""]); // eslint-disable-line react-hooks/exhaustive-deps -- 생성 한 번에 시계 하나

  const [count, setCount] = useState(1);
  const [round, setRound] = useState(0);

  const canStart = ready && !busy && !round && (song.style_prompt.trim() || song.lyrics.trim());

  // 생성 개수만큼 같은 가사·스타일로 차례로 만든다(한 곡씩 — PC 한 대가 동시에 두 곡을 만들면 더 느리다).
  const generate = async () => {
    setError(null);
    for (let i = 1; i <= count && !cancelled.current; i++) {
      setRound(i);
      if (!(await generateOne())) break;
    }
    setRound(0);
  };

  const generateOne = async (): Promise<boolean> => {
    if (!status) return false;
    setBusy("start");
    try {
      const taskId = await startTask(song, status.device, status.quality);
      setBusy("run");
      const until = Date.now() + MAX_WAIT_MS;
      while (!cancelled.current) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        const s = await checkTask(taskId);
        if (s.state === "failed") throw new EngineError(s.error);
        if (s.state === "done") {
          setBusy("fetch");
          const name = title.trim() || "제목 없는 노래";
          let url: string;
          let ext = "mp3";
          let trackId: string | null = null;
          let saved: Take["saved"] = "old-engine";
          if (hasLibrary(status)) {
            // 보관: 내 PC 보관 폴더에 복사 → 「모든 음악」 기록 한 줄. 기록이 실패해도 음원은 PC에 남는다.
            const id = crypto.randomUUID();
            await saveToLibrary(id, s.file, name);
            const res = await fetch("/api/tracks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, song_id: songId, title: name, ...song, device: status.device }),
            }).catch(() => null);
            saved = res?.ok ? "saved" : "record-failed";
            trackId = id;
            ({ url, ext } = await fetchLibraryFile(id));
          } else {
            url = await fetchAudio(s.file);
          }
          urls.current.push(url);
          setTakes((list) => [{ id: taskId, trackId, ext, title: name, url, seconds: song.duration_sec, at: new Date().toLocaleTimeString("ko-KR"), saved }, ...list]);
          return true;
        }
        if (Date.now() > until) throw new EngineError("너무 오래 걸려 기다리기를 멈췄습니다. 엔진 창에 오류가 있는지 확인해 주세요.");
      }
      return false;
    } catch (e) {
      setError(e instanceof EngineError ? { text: e.message, needPair: e.needPair } : { text: "노래를 만들지 못했습니다." });
      return false;
    } finally {
      setBusy("");
    }
  };

  const nth = count > 1 && round ? ` (${round}/${count}곡)` : "";
  const stageText =
    (busy === "start" ? "엔진에 보내는 중…" : busy === "run" ? "노래 만드는 중…" : busy === "fetch" ? "완성된 노래 받는 중…" : "") + (busy ? nth : "");

  return (
    <section className="space-y-3 rounded-2xl border border-teal-500/20 bg-gradient-to-b from-[#0a0f1d] to-[#070b14] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Cpu className="h-4 w-4 text-teal-300" /> 내 PC로 노래 만들기
        </h2>
        <span className="text-[11px] text-slate-400">
          {checking
            ? "엔진 확인 중…"
            : !online
              ? "엔진 꺼짐"
              : !paired
                ? "PC 연결 필요"
                : !ready
                  ? status?.stage
                  : `연결됨 · ${status?.mode} · 예상 ${estimate(status!.device, song.duration_sec)}`}
        </span>
      </div>

      {!checking && (!online || !paired) && (
        <p className="text-xs leading-relaxed text-slate-400">
          {!online ? "내 PC 엔진이 꺼져 있거나 브라우저가 연결을 막고 있습니다. " : "이 브라우저를 엔진과 한 번 연결해야 합니다. "}
          <Link href="/engine" className="font-semibold text-emerald-300 underline underline-offset-2">
            내 PC 엔진 화면
          </Link>
          에서 확인해 주세요.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={generate}
          disabled={!canStart}
          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {busy ? stageText : count > 1 ? `노래 ${count}곡 만들기` : "노래 만들기"}
        </button>
        <select
          aria-label="생성 개수"
          value={count}
          disabled={!!busy || !!round}
          onChange={(e) => setCount(Number(e.target.value))}
          className="rounded-xl border border-slate-700/60 bg-slate-950/80 px-3 py-2.5 text-xs text-slate-100 focus:border-emerald-400 focus:outline-hidden disabled:opacity-40"
        >
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>
              {n}곡{n > 1 ? " (같은 가사로 다른 버전)" : ""}
            </option>
          ))}
        </select>
        {busy && (
          <span className="font-mono text-xs text-teal-200">
            {clock(elapsed)} 지남 <span className="text-slate-500">· 처음 한 번은 음악 모델(약 10GB)을 받느라 더 걸립니다</span>
          </span>
        )}
      </div>

      {error && (
        <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error.text}
          {error.needPair && (
            <Link href="/engine" className="shrink-0 underline underline-offset-2">
              PC 연결하러 가기
            </Link>
          )}
        </p>
      )}

      {takes.length > 0 && (
        <ul className="space-y-2 pt-1">
          {takes.map((t) => (
            <li key={t.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-semibold text-slate-100">{t.title}</span>
                <span className="text-slate-500">
                  {t.seconds}초 · {t.at}
                </span>
                <span className="ml-auto">
                  <DownloadButtons trackId={t.trackId} title={t.title} ext={t.ext} fallbackUrl={t.url} ffmpeg={!!status?.quality?.ffmpeg} onError={(m) => setError({ text: m })} />
                </span>
              </div>
              <audio controls src={t.url} className="w-full" />
              <p className={`text-[11px] ${t.saved === "saved" ? "text-emerald-300/80" : "text-amber-300/80"}`}>
                {t.saved === "saved" ? (
                  <>
                    ✔ 내 PC 보관함에 저장했습니다 —{" "}
                    <Link href="/library" className="underline underline-offset-2">
                      모든 음악
                    </Link>
                    에서 다시 들을 수 있습니다.
                  </>
                ) : t.saved === "record-failed" ? (
                  "음원은 내 PC 보관함에 저장했지만 목록 기록을 남기지 못했습니다. [내려받기]로 따로 저장해 두세요."
                ) : (
                  "이 엔진은 보관함이 없는 옛 버전이라 화면을 떠나면 사라집니다. [내려받기]로 저장하고, 엔진을 새로 받아 주세요."
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
