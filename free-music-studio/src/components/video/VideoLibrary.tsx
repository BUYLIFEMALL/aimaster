"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Film, FolderOpen, Play, Trash2, X, AlertCircle } from "lucide-react";
import { EngineError, deleteVideo, listVideos, revealVideoFolder, videoFileUrl, type VideoRecord } from "@/lib/engine";
import { chapterText, templateOf } from "@/lib/video/videoOptions";

// 만든 영상 — 기록은 회원 PC 엔진(videos.json)에만 둔다(2026-11-06 주인님 결정 「영상 기록은 회원 PC에만」).
const clock = (s: number) => {
  const t = Math.round(s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
const size = (b: number) => (b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(1)}GB` : `${Math.max(1, Math.round(b / 1024 ** 2))}MB`);

export function VideoLibrary({ refreshKey }: { refreshKey: number }) {
  const [videos, setVideos] = useState<VideoRecord[] | null>(null);
  const [dir, setDir] = useState("");
  const [playing, setPlaying] = useState("");
  const [confirm, setConfirm] = useState("");
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await listVideos();
      setVideos(r.videos);
      setDir(r.dir);
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "영상 목록을 읽지 못했습니다.");
      setVideos([]);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const act = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      await load();
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "처리하지 못했습니다.");
    }
  };
  const copyChapters = async (v: VideoRecord) => {
    try {
      await navigator.clipboard.writeText(chapterText(v.chapters));
      setCopied(v.id);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      setError("복사하지 못했습니다. 브라우저의 클립보드 허용을 확인해 주세요.");
    }
  };

  return (
    <section className="space-y-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Film className="h-4 w-4 text-emerald-300" /> 만든 영상 {videos?.length ?? 0}개
        </h2>
        {dir && <span className="truncate text-[11px] text-slate-500" title={dir}>저장 폴더: {dir}</span>}
        <button type="button" onClick={() => act(revealVideoFolder)} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900">
          <FolderOpen className="h-3.5 w-3.5" /> 영상 폴더 열기
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
          <AlertCircle className="h-4 w-4" /> {error}
        </p>
      )}
      {videos === null ? (
        <p className="text-xs text-slate-500">불러오는 중…</p>
      ) : videos.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-500">아직 만든 영상이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {videos.map((v) => (
            <li key={v.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-100">{v.title}</span>
                <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{templateOf(v.template)?.name ?? v.template}</span>
                <span className="text-[11px] text-slate-500">
                  {clock(v.duration)} · {v.width}×{v.height} · {v.fps}fps · {size(v.size)}
                  {v.repeat > 1 ? ` · ${v.repeat}번 반복` : ""} · 음량 {v.loudness} · {new Date(v.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                {v.missing && <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">파일 없음(옮기거나 지움)</span>}
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  {!v.missing && (
                    <button type="button" onClick={() => setPlaying(playing === v.id ? "" : v.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/40">
                      {playing === v.id ? <X className="h-3 w-3" /> : <Play className="h-3 w-3" />} {playing === v.id ? "닫기" : "보기"}
                    </button>
                  )}
                  <button type="button" title="유튜브 설명란에 붙이는 「0:00 제목」 챕터" onClick={() => copyChapters(v)} className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900">
                    <Copy className="h-3 w-3" /> {copied === v.id ? "복사됨" : "챕터 복사"}
                  </button>
                  {confirm === v.id ? (
                    <>
                      <button type="button" onClick={() => act(() => deleteVideo(v.id, false))} className="rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900">
                        목록에서만
                      </button>
                      <button type="button" onClick={() => act(() => deleteVideo(v.id, true))} className="rounded-lg border border-rose-500/50 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 hover:bg-rose-950/40">
                        파일까지 지우기
                      </button>
                      <button type="button" onClick={() => setConfirm("")} className="rounded-lg px-2 py-1.5 text-[11px] text-slate-500 hover:text-slate-300">
                        그만두기
                      </button>
                    </>
                  ) : (
                    <button type="button" aria-label="지우기" onClick={() => setConfirm(v.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-900 hover:text-rose-300">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </span>
              </div>
              <p className="truncate text-[11px] text-slate-500" title={v.file}>{v.file}</p>
              {playing === v.id && <video controls autoPlay src={videoFileUrl(v.id)} className={`rounded-lg bg-black ${v.height > v.width ? "mx-auto max-h-[560px]" : "w-full"}`} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
