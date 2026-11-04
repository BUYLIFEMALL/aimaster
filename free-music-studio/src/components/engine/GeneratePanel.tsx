"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Cpu, Loader2, AlertCircle, Wand2, ListPlus, CheckCircle2 } from "lucide-react";
import { useEngine } from "./useEngine";
import { DownloadButtons } from "./DownloadButtons";
import {
  EngineError,
  enqueueSong,
  hasQueue,
  availableEngines,
  consentKey,
  engineInfo,
  fetchHfToken,
  LICENSE_LABEL,
  MUSIC_ENGINES,
  type MusicEngineId,
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
  const [queueing, setQueueing] = useState(false);

  const canStart = ready && !busy && !round && (song.style_prompt.trim() || song.lyrics.trim());
  // 엔진 0.1.6+: 엔진 대기열에 넣는다(탭을 닫아도 계속 만들고, 엔진이 준비 중이어도 넣어 둘 수 있음)
  const queueMode = paired && hasQueue(status);
  // 엔진 0.2.0+: 음악 엔진 고르기 — v1.12(엔진 0.4.0)부터 「상업용」·「개인용」 두 묶음, 개인용은 엔진마다 처음 쓸 때 동의
  const engines = queueMode ? availableEngines(status) : [];
  const [musicEngine, setMusicEngine] = useState<MusicEngineId>("acestep");
  const [consents, setConsents] = useState<Partial<Record<MusicEngineId, boolean>>>({});
  useEffect(() => {
    const next: Partial<Record<MusicEngineId, boolean>> = {};
    try {
      for (const e of MUSIC_ENGINES) if (e.license === "noncommercial") next[e.id] = localStorage.getItem(consentKey(e.id)) === "1";
    } catch {}
    setConsents(next);
  }, []);
  const engineToUse: MusicEngineId = engines.some((e) => e.id === musicEngine) ? musicEngine : "acestep";
  const picked = engineInfo(engineToUse);
  const consent = picked.license === "commercial" || !!consents[engineToUse];
  const agree = (v: boolean) => {
    setConsents((c) => ({ ...c, [engineToUse]: v }));
    try {
      if (v) localStorage.setItem(consentKey(engineToUse), "1");
      else localStorage.removeItem(consentKey(engineToUse));
    } catch {}
  };
  // 약관 동의가 필요한 모델(Stable Audio 3)은 회원 본인 Hugging Face 토큰으로 처음 한 번 받는다
  const [hfToken, setHfToken] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    if (picked.hfToken && hfToken === undefined) void fetchHfToken().then(setHfToken);
  }, [picked.hfToken, hfToken]);
  const canQueue = queueMode && !queueing && !!(song.style_prompt.trim() || song.lyrics.trim()) && consent;
  const [queued, setQueued] = useState(0);

  const addToQueue = async () => {
    if (!status) return;
    setError(null);
    setQueueing(true);
    let n = 0;
    try {
      const token = picked.hfToken ? (hfToken ?? (await fetchHfToken())) : null;
      for (let i = 0; i < count; i++) {
        await enqueueSong(song, { title: title.trim() || "제목 없는 노래", songId, device: status.device }, status.quality, engineToUse, token);
        n++;
      }
    } catch (e) {
      setError(e instanceof EngineError ? { text: e.message, needPair: e.needPair } : { text: "대기열에 넣지 못했습니다." });
    } finally {
      setQueued((q) => q + n);
      setQueueing(false);
    }
  };

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

      {engines.length > 1 && (
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[11px] font-semibold text-slate-300">🎛️ 음악 엔진</p>
          {(
            [
              { license: "commercial", title: "💼 상업용 — 수익 영상·판매에도 쓸 수 있음" },
              { license: "noncommercial", title: "🏠 개인용 — 개인 감상·비수익만" },
            ] as const
          ).map((g) => {
            const list = engines.filter((e) => e.license === g.license);
            if (!list.length) return null;
            return (
              <div key={g.license} className="space-y-1.5">
                <p className={`text-[11px] font-bold ${g.license === "commercial" ? "text-emerald-300" : "text-amber-300"}`}>{g.title}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {list.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => setMusicEngine(o.id)}
                      aria-pressed={engineToUse === o.id}
                      className={`rounded-xl border p-3 text-left transition ${engineToUse === o.id ? (o.license === "commercial" ? "border-emerald-400/70 bg-emerald-500/10" : "border-amber-400/70 bg-amber-500/10") : "border-slate-700/60 hover:border-slate-500"}`}
                    >
                      <span className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-100">
                        {o.name}
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${o.license === "commercial" ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>
                          {o.terms && o.license === "commercial" ? "상업용(조건)" : LICENSE_LABEL[o.license]}
                        </span>
                        <span className="rounded-full bg-slate-700/60 px-2 py-0.5 text-[10px] font-semibold text-slate-300">{o.kind === "vocal" ? "🎤 노래" : o.kind === "instrumental" ? "🎹 연주곡" : "🎤 노래 · 🎹 연주곡"}</span>
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{o.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {picked.kind === "instrumental" && song.lyrics.trim() && (
            <p className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-2.5 text-[11px] leading-relaxed text-sky-100/90">🎹 {picked.name}은(는) 노래 없는 연주곡 엔진입니다. 가사는 쓰지 않고 스타일 설명으로만 만듭니다.</p>
          )}
          {picked.korean === "untested" && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-100/90">🧪 {picked.name}은(는) 한국어 발음을 아직 확인하지 않았습니다. 한국어가 잘 안 되면 이 모델은 목록에서 빠집니다.</p>
          )}
          {picked.id !== "acestep" && (
            <p className="text-[11px] leading-relaxed text-slate-400">
              💡 처음 한 번은 {picked.name} 모델{picked.firstGb ? `(약 ${picked.firstGb}GB)` : ""}을 내 PC로 받느라 오래 걸립니다. 만드는 동안 ACE-Step은 잠시 멈췄다가 끝나면 다시 켜집니다. 지금은 새 곡 만들기만 됩니다.
              {status?.modelsDir && (
                <>
                  {" "}
                  받는 곳: <span className="font-mono text-slate-300">{status.modelsDir}</span> (「내 PC 엔진」 → 「모델 저장 공간」에서 다른 드라이브로 바꿀 수 있음)
                </>
              )}
            </p>
          )}
          {picked.license === "commercial" && picked.terms && <p className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5 text-[11px] leading-relaxed text-emerald-100/90">📜 {picked.terms}</p>}
          {picked.hfToken && hfToken === null && (
            <p className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-2.5 text-[11px] leading-relaxed text-rose-100/90">
              🔑 {picked.name} 모델은 회원님 본인 Hugging Face 토큰이 있어야 처음 받을 수 있습니다(무료).{" "}
              <a href={picked.gatedUrl} target="_blank" rel="noreferrer" className="font-semibold underline underline-offset-2">
                모델 페이지
              </a>
              에서 약관에 동의한 뒤{" "}
              <Link href="/settings" className="font-semibold underline underline-offset-2">
                설정
              </Link>
              에 읽기(Read) 토큰을 등록해 주세요. 이미 받아 둔 PC는 없어도 됩니다.
            </p>
          )}
          {picked.license === "noncommercial" && (
            <div className="space-y-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-[11px] leading-relaxed text-amber-100/90">
              <p>⚠️ {picked.terms} 「모든 음악」에 「비상업용」으로 표시됩니다.</p>
              <label className="flex items-center gap-2 font-semibold text-amber-200">
                <input type="checkbox" checked={consent} onChange={(e) => agree(e.target.checked)} className="h-3.5 w-3.5 accent-amber-400" />
                {picked.name}은(는) 비상업 용도로만 쓰겠습니다
              </label>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {queueMode ? (
          <button
            type="button"
            onClick={addToQueue}
            disabled={!canQueue}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {queueing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListPlus className="h-4 w-4" />} {queueing ? "대기열에 넣는 중…" : count > 1 ? `대기열에 ${count}곡 넣기` : "대기열에 넣기"}
          </button>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={!canStart}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {busy ? stageText : count > 1 ? `노래 ${count}곡 만들기` : "노래 만들기"}
          </button>
        )}
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

      {queueMode && queued > 0 && (
        <p className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-emerald-300">
          <CheckCircle2 className="h-4 w-4" /> 이번에 대기열에 {queued}곡 넣었습니다. 엔진이 차례로 만들고, 다 되면 「모든 음악」에 저절로 기록됩니다.
          <Link href="/queue" className="underline underline-offset-2">
            작업 대기열 보기
          </Link>
        </p>
      )}
      {queueMode && !ready && <p className="text-[11px] text-slate-400">엔진이 아직 준비 중이어도 넣어 둘 수 있습니다. 준비되면 이어서 만듭니다.</p>}

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
