"use client";

// 곡 상세 패널 — 원본 boks-music `src/App.tsx`(MIT, © 2026 boksajang)의 오른쪽 곡 상세(앨범 그림·원곡·스타일·가사 복사,
// 「가사 없는 연주곡입니다」, 제목·가사 수정, 앨범아트 업로드 1:1)와 `StemWaveform.tsx`의 눌러서 이동하는 파형을 옮김(2026-11-06).
import { useEffect, useMemo, useState } from "react";
import { Copy, Download, ImageUp, Loader2, Music2, Pencil, Play, X } from "lucide-react";
import { EngineError, fetchLibraryArt, getWaveform, setTrackArt } from "@/lib/engine";
import { isInstrumental } from "@/lib/trackFilters";
import { LIMITS } from "@/lib/songs";
import { KIND_LABEL, type Track } from "@/lib/tracks";
import { hashLyrics, remapLyricTiming, type LyricTiming } from "@/lib/lyricTiming";
import { usePlayer } from "@/components/player/PlayerProvider";
import { LyricTimingPanel } from "./LyricTimingPanel";

const ART_TYPES = ["image/png", "image/jpeg", "image/webp"];
const ART_MAX = 9 * 1024 * 1024;
const BARS = 160;
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** 올릴 그림 검사 — 원본처럼 정사각형(1:1)만, PNG·JPG·WEBP, 크기 제한. 문제가 있으면 안내 문장 */
export async function checkArtFile(file: File): Promise<string | null> {
  if (!ART_TYPES.includes(file.type)) return "PNG·JPG·WEBP 그림만 올릴 수 있습니다.";
  if (file.size > ART_MAX) return "그림이 9MB보다 큽니다. 크기를 줄여 다시 올려 주세요.";
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    bmp.close();
    if (width !== height) return `정사각형(1:1) 그림만 표지로 쓸 수 있습니다. 지금 그림은 ${width}×${height}입니다.`;
  } catch {
    return "그림을 읽지 못했습니다. 다른 파일로 해 주세요.";
  }
  return null;
}

export function TrackDetailPanel({
  track,
  parentTitle,
  hasArt,
  artVersion,
  onPc,
  canWave,
  canSetArt,
  onClose,
  onPlay,
  onSaved,
  onArtChanged,
  onCopy,
}: {
  track: Track;
  parentTitle: string | null;
  hasArt: boolean;
  artVersion: number;
  onPc: boolean;
  canWave: boolean;
  canSetArt: boolean;
  onClose: () => void;
  onPlay: () => void;
  onSaved: (t: Track) => void;
  onArtChanged: () => void;
  onCopy: (text: string, what: string) => void;
}) {
  const player = usePlayer();
  const [art, setArt] = useState("");
  const [wave, setWave] = useState<{ peaks: number[]; duration: number } | null>(null);
  const [waveError, setWaveError] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(track.title);
  const [lyrics, setLyrics] = useState(track.lyrics);
  const [busy, setBusy] = useState<"" | "save" | "art">("");
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setEditing(false);
    setTitle(track.title);
    setLyrics(track.lyrics);
    setNote(null);
  }, [track.id, track.title, track.lyrics]);

  // 앨범 그림(표지를 바꾸면 artVersion이 올라 다시 받음)
  useEffect(() => {
    if (!hasArt || !onPc) return setArt("");
    let url = "";
    let gone = false;
    fetchLibraryArt(track.id)
      .then((u) => (gone ? URL.revokeObjectURL(u) : setArt((url = u))))
      .catch(() => setArt(""));
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [track.id, hasArt, onPc, artVersion]);

  // 파형(엔진 0.6.9+)
  useEffect(() => {
    setWave(null);
    setWaveError("");
    if (!canWave || !onPc) return;
    let gone = false;
    getWaveform(track.id)
      .then((w) => !gone && setWave(w))
      .catch((e) => !gone && setWaveError(e instanceof EngineError ? e.message : "파형을 읽지 못했습니다."));
    return () => {
      gone = true;
    };
  }, [track.id, canWave, onPc]);

  const bars = useMemo(() => {
    if (!wave) return [];
    const per = wave.peaks.length / BARS;
    return Array.from({ length: BARS }, (_, i) => Math.max(...wave.peaks.slice(Math.floor(i * per), Math.floor((i + 1) * per)), 0));
  }, [wave]);

  const isCurrent = player?.current?.key === track.id;
  const progress = isCurrent && player.duration ? player.time / player.duration : 0;

  const seekTo = (ratio: number) => {
    if (isCurrent && player.duration) player.seek(ratio * player.duration);
    else onPlay();
  };

  const save = async () => {
    setBusy("save");
    setNote(null);
    try {
      // 가사를 고치면 지난 가사 시간에서 그대로인 줄은 지키고 고친 줄만 「확인 필요」로(원본 remapLyricTiming)
      let timing: LyricTiming | null | undefined;
      let timingNote = "";
      const t = track.lyric_timing;
      if (t && lyrics !== track.lyrics && t.lyricsHash === (await hashLyrics(track.lyrics))) {
        const r = remapLyricTiming(t, lyrics, await hashLyrics(lyrics));
        timing = r.timing;
        timingNote = r.timing ? ` 가사 시간은 ${r.kept}줄 그대로, ${r.changed + r.added}줄은 「확인 필요」입니다.` : " 가사가 모두 바뀌어 가사 시간을 지웠습니다.";
      }
      const res = await fetch(`/api/tracks/${track.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, lyrics, ...(timing !== undefined ? { lyric_timing: timing } : {}) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "저장하지 못했습니다.");
      onSaved({ ...track, title: title.trim(), lyrics, ...(timing !== undefined ? { lyric_timing: timing } : {}) });
      setEditing(false);
      setNote({ ok: true, text: `제목·가사를 저장했습니다. 내 PC의 음원 파일 이름은 그대로입니다.${timingNote}` });
    } catch (e) {
      setNote({ ok: false, text: e instanceof Error ? e.message : "저장하지 못했습니다." });
    } finally {
      setBusy("");
    }
  };

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setNote(null);
    const bad = await checkArtFile(file);
    if (bad) return setNote({ ok: false, text: bad });
    setBusy("art");
    try {
      await setTrackArt(track.id, file);
      onArtChanged();
      setNote({ ok: true, text: "표지를 바꿨습니다. MP3로 받을 때도 새 표지가 들어갑니다." });
    } catch (e) {
      setNote({ ok: false, text: e instanceof EngineError ? e.message : "표지를 바꾸지 못했습니다." });
    } finally {
      setBusy("");
    }
  };

  const btn = "inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-40";
  const instrumental = isInstrumental(track);

  return (
    <>
      <button type="button" aria-label="곡 상세 닫기" onClick={onClose} className="fixed inset-0 z-20 bg-black/50 lg:hidden" />
      {/* 옆 패널(대화창 아님) — 재생 단축키는 그대로 쓰이고, 아래 재생바(z-30)가 패널 위에 보인다 */}
      <aside aria-label={`${track.title} 상세`} className="fixed inset-y-0 right-0 z-20 w-full max-w-md space-y-4 overflow-y-auto border-l border-slate-800 bg-[#0a0f1d] p-5 pb-28 shadow-2xl">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold tracking-wide text-emerald-300">곡 상세</p>
          <button type="button" onClick={onClose} aria-label="닫기" className="ml-auto rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 앨범 그림 */}
        <div className="space-y-2">
          <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {art ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={art} alt={`${track.title} 표지`} className="h-full w-full object-cover" />
            ) : (
              <Music2 className="h-12 w-12 text-slate-700" aria-hidden />
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {art && (
              <a href={art} download={`${track.title}.png`} className={btn}>
                <Download className="h-3.5 w-3.5" /> 그림 내려받기
              </a>
            )}
            {canSetArt && onPc && (
              <label className={`${btn} cursor-pointer`}>
                {busy === "art" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />} 표지 올리기(1:1)
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={!!busy} onChange={(e) => (upload(e.target.files?.[0]), (e.target.value = ""))} />
              </label>
            )}
          </div>
        </div>

        {/* 제목·정보 */}
        {editing ? (
          <div className="space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LIMITS.title} aria-label="제목" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-hidden" />
            <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} maxLength={LIMITS.lyrics} aria-label="가사" rows={10} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs leading-relaxed text-slate-100 focus:border-emerald-400 focus:outline-hidden" />
            <div className="flex gap-1.5">
              <button type="button" onClick={save} disabled={!!busy || !title.trim()} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-40">
                {busy === "save" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} 저장
              </button>
              <button type="button" onClick={() => (setEditing(false), setTitle(track.title), setLyrics(track.lyrics))} className={btn}>
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-start gap-2">
              <h2 className="min-w-0 flex-1 break-words text-lg font-bold text-slate-100">{track.title}</h2>
              <button type="button" onClick={() => setEditing(true)} className={btn}>
                <Pencil className="h-3.5 w-3.5" /> 제목·가사 수정
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              {mmss(track.duration_sec)}
              {KIND_LABEL[track.kind] ? ` · ${KIND_LABEL[track.kind]}` : instrumental ? " · 연주곡" : " · 보컬곡"}
              {track.license === "noncommercial" ? " · 비상업용" : ""} · {new Date(track.created_at).toLocaleString("ko-KR")}
            </p>
            {track.parent_id && <p className="text-[11px] text-sky-300">원곡: {parentTitle ?? "지운 곡"}</p>}
          </div>
        )}

        {note && <p className={`rounded-lg px-3 py-2 text-[11px] font-semibold ${note.ok ? "bg-emerald-950/50 text-emerald-200" : "bg-rose-950/50 text-rose-200"}`}>{note.text}</p>}

        {/* 파형 — 누르면 그 자리로(지금 재생 중인 곡일 때), 아니면 재생 시작 */}
        {onPc && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <button type="button" onClick={onPlay} className={btn}>
                <Play className="h-3.5 w-3.5" /> {isCurrent && player?.playing ? "멈춤" : "듣기"}
              </button>
              {isCurrent && <span className="text-[11px] tabular-nums text-slate-500">{mmss(player.time)} / {mmss(player.duration || track.duration_sec)}</span>}
            </div>
            {canWave &&
              (wave ? (
                <div
                  role="slider"
                  aria-label="재생 위치"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  tabIndex={0}
                  onClick={(e) => {
                    const r = e.currentTarget.getBoundingClientRect();
                    seekTo((e.clientX - r.left) / r.width);
                  }}
                  className="flex h-16 cursor-pointer items-center gap-px rounded-xl border border-slate-800 bg-slate-950/60 px-1.5"
                  title={isCurrent ? "눌러서 그 자리로" : "누르면 재생합니다"}
                >
                  {bars.map((v, i) => (
                    <span key={i} className={`flex-1 rounded-full ${i / BARS < progress ? "bg-emerald-400" : "bg-slate-600"}`} style={{ height: `${Math.max(4, v * 100)}%` }} />
                  ))}
                </div>
              ) : waveError ? (
                <p className="text-[11px] text-slate-500">{waveError}</p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> 파형을 그리는 중…</p>
              ))}
          </div>
        )}

        {/* 가사 시간(원본 LyricTimingEditor·LRC/SRT, 2026-11-06) */}
        {!instrumental && <LyricTimingPanel track={track} onPc={onPc} onPlay={onPlay} onSaved={onSaved} />}

        {/* 스타일·가사 */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-200">스타일</p>
            {track.style_prompt && (
              <button type="button" onClick={() => onCopy(track.style_prompt, "스타일")} className={`${btn} ml-auto`}>
                <Copy className="h-3.5 w-3.5" /> 복사
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap rounded-xl bg-slate-950/60 p-3 font-mono text-[11px] text-teal-300/80">{track.style_prompt || "(스타일 없음)"}</p>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-slate-200">가사</p>
            {!instrumental && (
              <button type="button" onClick={() => onCopy(track.lyrics, "가사")} className={`${btn} ml-auto`}>
                <Copy className="h-3.5 w-3.5" /> 복사
              </button>
            )}
          </div>
          <p className="whitespace-pre-wrap rounded-xl bg-slate-950/60 p-3 text-xs leading-relaxed text-slate-300">{instrumental ? "가사 없는 연주곡입니다." : track.lyrics}</p>
        </div>
      </aside>
    </>
  );
}
