"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Eye, EyeOff, Pause, Play } from "lucide-react";
import { moveHandle, parseTrim, ratioToTime, TRIM_STEP } from "@/lib/trimBar";

type Props = {
  file?: File;
  duration: number;
  trimStart: string;
  trimEnd: string;
  onChange: (trimStart: string, trimEnd: string) => void;
  // 미리보기는 한 번에 한 영상만 연다(부모가 어떤 줄이 열렸는지 기억).
  previewOpen: boolean;
  onTogglePreview: () => void;
};

/**
 * v1.13: 끌어서 고르는 구간 막대와 장면 미리보기. 숫자 칸과 같은 trimStart/trimEnd 값을 쓴다.
 * 미리보기 영상은 열린 동안만 object URL을 만들고 닫히면(또는 줄이 사라지면) 바로 정리한다.
 */
export default function TrimBar({ file, duration, trimStart, trimEnd, onChange, previewOpen, onTogglePreview }: Props) {
  const { start, end } = parseTrim(trimStart, trimEnd, duration);
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const dragRef = useRef<"start" | "end" | null>(null);
  // 장면 이동이 느린 브라우저에서 요청이 쌓이지 않게, 이전 이동이 끝난 뒤 마지막 위치만 보낸다.
  const seekingRef = useRef(false);
  const pendingSeekRef = useRef<number | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!previewOpen || !file) return;
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => {
      URL.revokeObjectURL(u);
      setUrl(null);
      setPlaying(false);
    };
  }, [previewOpen, file]);

  function seek(t: number) {
    const v = videoRef.current;
    if (!v) return;
    if (seekingRef.current) {
      pendingSeekRef.current = t;
      return;
    }
    seekingRef.current = true;
    v.currentTime = t;
  }

  function onSeeked() {
    seekingRef.current = false;
    const next = pendingSeekRef.current;
    if (next !== null) {
      pendingSeekRef.current = null;
      seek(next);
    }
  }

  function apply(which: "start" | "end", t: number) {
    const r = moveHandle(which, t, { start, end }, duration);
    onChange(r.trimStart, r.trimEnd);
    if (url) {
      videoRef.current?.pause();
      setPlaying(false);
      seek(which === "start" ? r.start : r.end);
    }
  }

  function timeAt(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return ratioToTime((clientX - rect.left) / rect.width, duration);
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const t = timeAt(e.clientX);
    // 누른 곳에서 가까운 손잡이를 잡는다.
    const which = Math.abs(t - start) <= Math.abs(t - end) ? "start" : "end";
    dragRef.current = which;
    e.currentTarget.setPointerCapture(e.pointerId);
    apply(which, t);
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (dragRef.current) apply(dragRef.current, timeAt(e.clientX));
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function onKey(which: "start" | "end", e: KeyboardEvent<HTMLDivElement>) {
    const now = which === "start" ? start : end;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") apply(which, now - TRIM_STEP);
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") apply(which, now + TRIM_STEP);
    else return;
    e.preventDefault();
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
      return;
    }
    pendingSeekRef.current = null;
    seekingRef.current = false;
    v.currentTime = start;
    void v.play().then(
      () => setPlaying(true),
      () => setPlaying(false)
    );
  }

  // 구간 재생: 끝에 닿으면 시작으로 돌아가 반복한다.
  function onTimeUpdate() {
    const v = videoRef.current;
    if (v && playing && v.currentTime >= end) v.currentTime = start;
  }

  const pct = (t: number) => `${(t / duration) * 100}%`;
  const handleClass =
    "absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize rounded-full border-2 border-[#0d1117] bg-amber-300 shadow focus:outline-none focus:ring-2 focus:ring-amber-200";

  return (
    <div className="mt-2 w-full">
      <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span>
          {start.toFixed(1)}초 ~ {end.toFixed(1)}초 <span className="text-amber-300">({(end - start).toFixed(1)}초)</span>
        </span>
        {file && (
          <button
            type="button"
            onClick={onTogglePreview}
            className="flex items-center gap-1 rounded-lg border border-[#30363d] px-2 py-1 text-gray-300 hover:border-amber-400 hover:text-amber-300"
          >
            {previewOpen ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {previewOpen ? "장면 닫기" : "장면 보기"}
          </button>
        )}
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-1 h-8 cursor-pointer touch-none select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full border border-[#30363d] bg-[#161b22]" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
          style={{ left: pct(start), width: pct(end - start) }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="구간 시작"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={start}
          aria-valuetext={`${start.toFixed(1)}초`}
          onKeyDown={(e) => onKey("start", e)}
          className={handleClass}
          style={{ left: pct(start) }}
        />
        <div
          role="slider"
          tabIndex={0}
          aria-label="구간 끝"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={end}
          aria-valuetext={`${end.toFixed(1)}초`}
          onKeyDown={(e) => onKey("end", e)}
          className={handleClass}
          style={{ left: pct(end) }}
        />
      </div>

      {previewOpen && url && (
        <div className="mt-2 rounded-xl border border-[#30363d] bg-black p-2">
          <video
            ref={videoRef}
            src={url}
            muted
            playsInline
            preload="auto"
            onLoadedMetadata={() => seek(start)}
            onSeeked={onSeeked}
            onTimeUpdate={onTimeUpdate}
            onPause={() => setPlaying(false)}
            className="mx-auto block max-h-48 w-full rounded-lg object-contain"
          />
          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
            <span>손잡이를 끄는 동안 그 시점 장면을 보여 줍니다.</span>
            <button
              type="button"
              onClick={togglePlay}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 font-bold text-black hover:bg-amber-300"
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {playing ? "멈춤" : "구간 재생"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
