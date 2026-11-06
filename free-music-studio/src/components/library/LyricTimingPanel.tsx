"use client";

// 곡 상세의 「가사 시간」 — 원본 boks-music `src/LyricTimingEditor.tsx`·`LrcBadge.tsx`·LRC/SRT 불러오기·내보내기(MIT, © 2026 boksajang)를
// 우리 화면에 맞춰 옮김(2026-11-06). 직접 맞추기는 lyric-video-studio처럼 「들으면서 줄마다 찍기」 + 줄마다 ±0.2초 조정.
// 저장은 곡 기록의 lyric_timing(jsonb). 가사를 고치면 지문이 바뀌어 지난 시간 정보는 「없음」이 된다.
import { useEffect, useMemo, useState } from "react";
import { Download, FileUp, Loader2, Minus, Play, Plus, RotateCcw, Save, Timer, Wand2 } from "lucide-react";
import { usePlayer } from "@/components/player/PlayerProvider";
import { useEngine } from "@/components/engine/useEngine";
import { EngineError, enqueueAlign, hasAlign } from "@/lib/engine";
import {
  automaticDisplayEnds,
  checkCues,
  hashLyrics,
  lyricLines,
  lyricTimingState,
  parseLyricTimingFile,
  planLyricTimingImport,
  toLrc,
  toSrt,
  type Cue,
  type LyricTiming,
} from "@/lib/lyricTiming";
import type { Track } from "@/lib/tracks";

const t2 = (s: number | null) => (s === null ? "--:--.--" : `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`);

function download(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function LyricTimingPanel({ track, onPc, onPlay, onSaved }: { track: Track; onPc: boolean; onPlay: () => void; onSaved: (t: Track) => void }) {
  const player = usePlayer();
  const engine = useEngine(30000);
  const lines = useMemo(() => lyricLines(track.lyrics || ""), [track.lyrics]);
  const [hash, setHash] = useState("");
  const [editing, setEditing] = useState(false);
  const [cues, setCues] = useState<Cue[]>([]);
  const [at, setAt] = useState(0); // 다음에 찍을 줄
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let gone = false;
    hashLyrics(track.lyrics || "").then((h) => !gone && setHash(h));
    return () => {
      gone = true;
    };
  }, [track.lyrics]);

  const state = hash ? lyricTimingState(track.lyric_timing, track.lyrics || "", hash) : { state: null, review: 0 };
  const isCurrent = player?.current?.key === track.id;
  const duration = Math.max(track.duration_sec, isCurrent && player?.duration ? player.duration : 0);
  const timed = state.state ? track.lyric_timing!.cues : null;

  const save = async (timing: LyricTiming | null, lyrics?: string) => {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/tracks/${track.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lyric_timing: timing, ...(lyrics !== undefined ? { lyrics } : {}) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      onSaved({ ...track, lyric_timing: timing, ...(lyrics !== undefined ? { lyrics } : {}) });
      return true;
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했습니다." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  // LRC·SRT·VTT 불러오기 — 원본처럼 파일의 시간은 「직접 확인」으로, 가사가 다르면 파일 가사가 곡 가사가 된다
  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setNote(null);
    try {
      const entries = parseLyricTimingFile(file.name, new Uint8Array(await file.arrayBuffer()));
      const plan = planLyricTimingImport(entries, track.lyrics || "", duration);
      if (!plan.matches && !confirm(`파일의 가사(${plan.cues.length}줄)가 곡 가사와 다릅니다. 곡 가사를 파일의 가사로 바꾸고 시간을 붙일까요?`)) return;
      const timing: LyricTiming = { lyricsHash: await hashLyrics(plan.lyrics), duration, status: "manual", cues: plan.cues };
      if (await save(timing, plan.matches ? undefined : plan.lyrics)) setNote({ ok: true, text: `${file.name}에서 ${plan.cues.length}줄의 시간을 불러왔습니다${plan.matches ? "" : "(곡 가사도 파일 가사로 바꿈)"}.` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "파일을 읽지 못했습니다." });
    }
  };

  // 자동 맞추기(원본 lyric-alignment) — 내 PC 엔진 대기열에서 보컬 분리 → Qwen 정렬. 직접 맞춘 시작점은 그대로 남는다.
  const autoAlign = async () => {
    setBusy(true);
    setNote(null);
    try {
      await enqueueAlign(track);
      setNote({ ok: true, text: "자동 맞추기를 대기열에 넣었습니다. 처음에는 분리·분석 프로그램과 모델(약 6~10GB)을 받습니다. 끝나면 이 곡의 가사 시간에 저장되고, 확인이 필요한 줄은 「확인 필요」로 표시됩니다." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof EngineError ? e.message : "대기열에 넣지 못했습니다." });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = () => {
    const base = timed && timed.length === lines.length ? timed : lines.map((l) => ({ ...l, start: null, end: null, status: "review" as const }));
    setCues(base.map((c) => ({ ...c })));
    setAt(Math.max(0, base.findIndex((c) => c.start === null)));
    setEditing(true);
    setNote(null);
  };

  const stamp = () => {
    if (!isCurrent || at >= cues.length) return;
    const now = Math.round(player.time * 100) / 100;
    const prev = cues.slice(0, at).reverse().find((c) => c.start !== null)?.start ?? -1;
    if (now <= prev) return setNote({ ok: false, text: "앞 줄보다 늦은 시각에 눌러 주세요." });
    setCues((cs) => cs.map((c, i) => (i === at ? { ...c, start: now, status: "manual" } : c)));
    setAt((i) => i + 1);
  };
  const nudge = (i: number, d: number) => setCues((cs) => cs.map((c, k) => (k === i && c.start !== null ? { ...c, start: Math.max(0, Math.round((c.start + d) * 100) / 100), status: "manual" } : c)));

  const finish = async () => {
    const problem = checkCues(cues, lines, duration);
    if (problem) return setNote({ ok: false, text: problem });
    const done = automaticDisplayEnds(cues, duration).map((c) => ({ ...c, status: c.start === null ? ("review" as const) : c.status }));
    const missing = done.filter((c) => c.start === null).length;
    if (await save({ lyricsHash: hash, duration, status: missing ? "review" : "manual", cues: done })) {
      setEditing(false);
      setNote({ ok: true, text: missing ? `저장했습니다. 아직 ${missing}줄은 시간이 없습니다.` : "가사 시간을 저장했습니다." });
    }
  };

  const btn = "inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-40";
  if (!lines.length) return <p className="text-[11px] text-slate-500">가사가 없는 곡이라 가사 시간을 쓰지 않습니다.</p>;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex items-center gap-1 text-xs font-bold text-slate-200">
          <Timer className="h-3.5 w-3.5 text-teal-300" /> 가사 시간
        </p>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            state.state === "ready" ? "bg-emerald-500/15 text-emerald-200" : state.state === "review" ? "bg-amber-500/15 text-amber-200" : "bg-slate-800 text-slate-400"
          }`}
        >
          {state.state === "ready" ? "LRC 준비됨" : state.state === "review" ? `확인 필요 ${state.review}줄` : "없음"}
        </span>
      </div>
      {!editing && (
        <div className="flex flex-wrap gap-1.5">
          <label className={`${btn} cursor-pointer`}>
            <FileUp className="h-3.5 w-3.5" /> LRC·SRT 불러오기
            <input type="file" accept=".lrc,.srt,.vtt" className="hidden" disabled={busy} onChange={(e) => (importFile(e.target.files?.[0]), (e.target.value = ""))} />
          </label>
          <button type="button" onClick={startEdit} disabled={!onPc || busy} className={btn} title={onPc ? "" : "이 PC에 음원이 있어야 들으면서 맞출 수 있습니다"}>
            <Timer className="h-3.5 w-3.5" /> 직접 맞추기
          </button>
          <button
            type="button"
            onClick={autoAlign}
            disabled={!onPc || busy || !hasAlign(engine.status)}
            className={btn}
            title={!onPc ? "이 PC에 음원이 있어야 합니다" : !hasAlign(engine.status) ? "엔진 0.6.9 이상(윈도우)이 필요합니다" : "보컬만 분리해 가사 줄마다 시작점을 찾습니다(한국어·영어, 10분 이하)"}
          >
            <Wand2 className="h-3.5 w-3.5" /> 자동 맞추기
          </button>
          {timed && (
            <>
              <button type="button" disabled={state.state !== "ready"} title={state.state === "ready" ? "" : "모든 줄의 시간이 있어야 LRC로 내보낼 수 있습니다"} onClick={() => download(toLrc(timed, { title: track.title }), `${track.title}.lrc`, "text/plain")} className={btn}>
                <Download className="h-3.5 w-3.5" /> LRC
              </button>
              <button type="button" onClick={() => download(toSrt(timed), `${track.title}.srt`, "text/plain")} className={btn}>
                <Download className="h-3.5 w-3.5" /> SRT
              </button>
            </>
          )}
        </div>
      )}
      {editing && (
        <div className="space-y-2 rounded-xl border border-teal-500/30 bg-teal-950/20 p-3">
          <p className="text-[11px] leading-relaxed text-teal-100/80">곡을 재생하고, 각 줄을 부르기 시작할 때 「이 줄 시작」을 누르세요. 끝은 다음 줄 시작으로 정해집니다. 줄마다 ±0.2초로 고칠 수 있습니다.</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={onPlay} className={btn}>
              <Play className="h-3.5 w-3.5" /> {isCurrent && player?.playing ? "멈춤" : "재생"}
            </button>
            <button type="button" onClick={stamp} disabled={!isCurrent || at >= cues.length} className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
              이 줄 시작 ({Math.min(at + 1, cues.length)}/{cues.length})
            </button>
            <span className="text-[11px] tabular-nums text-slate-400">{isCurrent ? t2(player.time) : "재생을 먼저 눌러 주세요"}</span>
          </div>
          <ol className="max-h-64 space-y-1 overflow-y-auto">
            {cues.map((c, i) => (
              <li key={c.lineId} className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] ${i === at ? "bg-teal-900/40" : ""}`}>
                <span className="w-16 shrink-0 tabular-nums text-slate-400">{t2(c.start)}</span>
                <span className={`min-w-0 flex-1 truncate ${c.start === null ? "text-slate-500" : "text-slate-200"}`}>{c.text}</span>
                <button type="button" aria-label="0.2초 앞으로" disabled={c.start === null} onClick={() => nudge(i, -0.2)} className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30">
                  <Minus className="h-3 w-3" />
                </button>
                <button type="button" aria-label="0.2초 뒤로" disabled={c.start === null} onClick={() => nudge(i, 0.2)} className="rounded p-0.5 text-slate-400 hover:text-white disabled:opacity-30">
                  <Plus className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="이 줄부터 다시 찍기"
                  onClick={() => {
                    setAt(i);
                    if (isCurrent && c.start !== null) player.seek(Math.max(0, c.start - 1.5));
                  }}
                  className="rounded p-0.5 text-slate-400 hover:text-white"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ol>
          <div className="flex gap-1.5">
            <button type="button" onClick={finish} disabled={busy} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} 저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className={btn}>
              취소
            </button>
          </div>
        </div>
      )}
      {note && <p className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${note.ok ? "bg-emerald-950/50 text-emerald-200" : "bg-rose-950/50 text-rose-200"}`}>{note.text}</p>}
    </div>
  );
}
