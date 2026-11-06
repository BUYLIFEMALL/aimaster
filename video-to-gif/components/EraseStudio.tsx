"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Download, Eraser, Pause, Play, RotateCcw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import {
  MAX_REGIONS,
  checkEraseFile,
  enableExpr,
  eraseFilter,
  erasedFileName,
  toVideoRect,
  type Rect
} from "@/lib/eraseRegion";
import { logEraseRun } from "@/lib/actions/rights";

// ConverterWorkspace와 같은 ffmpeg 코어(CDN에서 받음, 우리 서버는 배포하지 않음)
const CORE_VERSION = "0.12.6";
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

type Source = { file: File; url: string; duration: number; width: number; height: number };
type Status = "idle" | "working" | "done" | "error";

function readMeta(url: string): Promise<{ duration?: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    const timer = setTimeout(() => resolve({ width: 0, height: 0 }), 8000);
    video.onloadedmetadata = () => {
      clearTimeout(timer);
      resolve({
        duration: Number.isFinite(video.duration) ? video.duration : undefined,
        width: video.videoWidth,
        height: video.videoHeight
      });
    };
    video.onerror = () => {
      clearTimeout(timer);
      resolve({ width: 0, height: 0 });
    };
    video.src = url;
  });
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function EraseStudio() {
  const [source, setSource] = useState<Source | null>(null);
  const [note, setNote] = useState("");
  const [rects, setRects] = useState<Rect[]>([]); // 영상 화소 기준
  const [drawing, setDrawing] = useState<Rect | null>(null); // 화면 표시 기준
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [ownWork, setOwnWork] = useState(false);
  const [notOthers, setNotOthers] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ url: string; name: string; size: number } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // 화면을 떠나면 만들어 둔 주소를 정리한다
  useEffect(() => () => {
    if (source) URL.revokeObjectURL(source.url);
  }, [source]);
  useEffect(() => () => {
    if (result) URL.revokeObjectURL(result.url);
  }, [result]);

  async function pickFile(file: File | undefined) {
    if (!file) return;
    setNote("");
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      setNote("동영상 파일(MP4·MOV·WEBM)만 넣을 수 있습니다.");
      return;
    }
    const url = URL.createObjectURL(file);
    const meta = await readMeta(url);
    const problem = checkEraseFile(file.size, meta.duration);
    if (problem || !meta.width || !meta.height) {
      URL.revokeObjectURL(url);
      setNote(problem ?? "이 브라우저가 읽지 못하는 영상입니다. MP4로 바꿔서 넣어 주세요.");
      return;
    }
    setSource({ file, url, duration: meta.duration!, width: meta.width, height: meta.height });
    setRects([]);
    setResult(null);
    setStatus("idle");
    setTime(0);
    setStart("");
    setEnd("");
  }

  function reset() {
    setSource(null);
    setRects([]);
    setResult(null);
    setStatus("idle");
    setNote("");
  }

  function pointIn(event: ReactPointerEvent<HTMLDivElement>) {
    const box = boxRef.current!.getBoundingClientRect();
    return {
      x: Math.min(box.width, Math.max(0, event.clientX - box.left)),
      y: Math.min(box.height, Math.max(0, event.clientY - box.top))
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (status === "working") return;
    if (rects.length >= MAX_REGIONS) {
      setNote(`지울 곳은 ${MAX_REGIONS}개까지 지정할 수 있습니다. 필요 없는 것을 먼저 지워 주세요.`);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    const p = pointIn(event);
    dragRef.current = p;
    setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const p = pointIn(event);
    setDrawing({ x: dragRef.current.x, y: dragRef.current.y, w: p.x - dragRef.current.x, h: p.y - dragRef.current.y });
  }

  function onPointerUp() {
    if (!dragRef.current || !drawing || !source || !boxRef.current) return;
    dragRef.current = null;
    const shown = { w: boxRef.current.clientWidth, h: boxRef.current.clientHeight };
    const rect = toVideoRect(drawing, shown, { w: source.width, h: source.height });
    setDrawing(null);
    if (!rect) {
      setNote("사각형이 너무 작습니다. 지울 부분을 조금 더 크게 끌어 주세요.");
      return;
    }
    setNote("");
    setRects((prev) => [...prev, rect]);
  }

  function seek(value: number) {
    setTime(value);
    if (videoRef.current) videoRef.current.currentTime = value;
  }

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  async function getFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    await ffmpeg.load({
      coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm")
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }

  const canRun = !!source && rects.length > 0 && ownWork && notOthers && status !== "working";

  async function run() {
    if (!source || !canRun) return;
    const range = enableExpr(start, end);
    if (range.error) {
      setNote(range.error);
      return;
    }
    setNote("");
    setResult(null);
    setProgress(0);
    setStatus("working");
    videoRef.current?.pause();

    // 기록을 먼저 남기고, 실패하면 시작하지 않는다(파일 이름·시각만 기록, 영상은 서버로 보내지 않음)
    const logged = await logEraseRun(source.file.name);
    if (!logged.ok) {
      setStatus("error");
      setNote(logged.error);
      return;
    }

    const ext = source.file.name.match(/\.[a-z0-9]+$/i)?.[0] ?? ".mp4";
    const inputName = `input${ext}`;
    let ffmpeg: FFmpeg | null = null;
    const onProgress = ({ progress: p }: { progress: number }) => setProgress(Math.min(1, Math.max(0, p)));
    try {
      ffmpeg = await getFFmpeg();
      ffmpeg.on("progress", onProgress);
      await ffmpeg.writeFile(inputName, await fetchFile(source.file));
      const code = await ffmpeg.exec([
        "-i", inputName,
        "-vf", eraseFilter(rects, range.expr),
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        "output.mp4"
      ]);
      if (code !== 0) throw new Error(`ffmpeg ${code}`);
      const bytes = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "video/mp4" });
      setResult({ url: URL.createObjectURL(blob), name: erasedFileName(source.file.name), size: blob.size });
      setProgress(1);
      setStatus("done");
    } catch (error) {
      console.error("[erase]", error);
      setStatus("error");
      setNote("지우기에 실패했습니다. 사각형을 조금 더 안쪽으로 그리거나, 다른 형식(MP4)으로 다시 넣어 주세요.");
    } finally {
      if (ffmpeg) {
        ffmpeg.off("progress", onProgress);
        await ffmpeg.deleteFile(inputName).catch(() => {});
        await ffmpeg.deleteFile("output.mp4").catch(() => {});
      }
    }
  }

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-8">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
            <Eraser className="h-5 w-5" />
          </span>
          <h1 className="text-xl font-extrabold text-white">내 영상 일부 지우기</h1>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">NEW</span>
        </div>
        <p className="text-sm text-gray-300">
          내가 만든 영상에 들어간 내 로고·글자·날짜 표시를 사각형으로 고르면, 주변 화면으로 자연스럽게 메워 줍니다.
          영상은 내 브라우저 안에서만 바뀌고 서버로 올라가지 않습니다.
        </p>
      </header>

      {!source ? (
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#30363d] bg-[#161b22] px-6 py-14 text-center hover:border-amber-500/50"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void pickFile(event.dataTransfer.files?.[0]);
          }}
        >
          <UploadCloud className="h-10 w-10 text-amber-400" />
          <div className="text-sm font-bold text-white">영상 1개를 끌어 놓거나 눌러서 고르세요</div>
          <div className="text-xs text-gray-400">MP4 · MOV · WEBM · 60초 이하 · 100MB 이하</div>
          <input type="file" accept="video/*,.mp4,.mov,.webm,.m4v" className="hidden" onChange={(event) => void pickFile(event.target.files?.[0])} />
        </label>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <section className="space-y-3">
            <div className="text-xs text-gray-400">
              🖱️ 화면 위를 끌어서 지울 곳을 사각형으로 고르세요(최대 {MAX_REGIONS}곳). 아래 막대로 다른 장면을 보며 위치를 맞출 수 있습니다.
            </div>
            <div
              ref={boxRef}
              className="relative mx-auto w-full max-h-[60vh] select-none overflow-hidden rounded-xl border border-[#30363d] bg-black touch-none"
              style={{ aspectRatio: `${source.width} / ${source.height}`, maxWidth: `calc(60vh * ${source.width / source.height})` }}
            >
              <video
                ref={videoRef}
                src={source.url}
                className="absolute inset-0 h-full w-full"
                playsInline
                muted
                onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              <div
                className="absolute inset-0 cursor-crosshair"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              >
                {rects.map((r, i) => (
                  <div
                    key={i}
                    className="absolute border-2 border-amber-400 bg-amber-400/20"
                    style={{ left: pct(r.x, source.width), top: pct(r.y, source.height), width: pct(r.w, source.width), height: pct(r.h, source.height) }}
                  >
                    <span className="absolute -top-5 left-0 rounded bg-amber-400 px-1 text-[10px] font-black text-slate-950">{i + 1}</span>
                  </div>
                ))}
                {drawing && (
                  <div
                    className="absolute border-2 border-dashed border-white bg-white/10"
                    style={{
                      left: Math.min(drawing.x, drawing.x + drawing.w),
                      top: Math.min(drawing.y, drawing.y + drawing.h),
                      width: Math.abs(drawing.w),
                      height: Math.abs(drawing.h)
                    }}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#30363d] bg-[#161b22] text-gray-200 hover:text-white"
                aria-label={playing ? "멈추기" : "재생"}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={source.duration}
                step={0.05}
                value={time}
                onChange={(event) => seek(Number(event.target.value))}
                className="flex-1 accent-amber-400"
                aria-label="장면 위치"
              />
              <span className="w-24 shrink-0 text-right font-mono text-xs text-gray-400">
                {time.toFixed(1)} / {source.duration.toFixed(1)}초
              </span>
            </div>
            <div className="text-xs text-gray-400">
              {source.file.name} · {formatBytes(source.file.size)} · {source.width}×{source.height}
            </div>
          </section>

          <aside className="space-y-4 rounded-2xl border border-[#30363d] bg-[#161b22] p-4">
            <div>
              <div className="mb-2 text-xs font-bold text-gray-200">지울 곳 ({rects.length}/{MAX_REGIONS})</div>
              {rects.length === 0 ? (
                <p className="text-xs text-gray-400">아직 없습니다. 왼쪽 화면에서 끌어서 그려 주세요.</p>
              ) : (
                <ul className="space-y-1.5">
                  {rects.map((r, i) => (
                    <li key={i} className="flex items-center justify-between rounded-lg border border-[#30363d] bg-[#0d1117] px-2.5 py-1.5 text-xs text-gray-300">
                      <span>
                        <b className="text-amber-300">{i + 1}</b> · 위치 {r.x},{r.y} · 크기 {r.w}×{r.h}
                      </span>
                      <button
                        type="button"
                        onClick={() => setRects((prev) => prev.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-400"
                        aria-label={`${i + 1}번 지울 곳 빼기`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-1 text-xs font-bold text-gray-200">적용 시간(초)</div>
              <p className="mb-2 text-[11px] text-gray-400">비워 두면 영상 전체에 적용합니다.</p>
              <div className="flex items-center gap-2">
                <input
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                  inputMode="decimal"
                  placeholder="처음"
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white"
                  aria-label="적용 시작 초"
                />
                <span className="text-gray-400">~</span>
                <input
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  inputMode="decimal"
                  placeholder="끝"
                  className="w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-1.5 text-xs text-white"
                  aria-label="적용 끝 초"
                />
              </div>
            </div>

            <div className="space-y-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-200">
                <ShieldCheck className="h-3.5 w-3.5" /> 실행 전 확인
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-200">
                <input type="checkbox" checked={ownWork} onChange={(event) => setOwnWork(event.target.checked)} className="mt-0.5 accent-amber-400" />
                <span>이 영상은 제가 만들었거나 권리를 가진 콘텐츠입니다.</span>
              </label>
              <label className="flex items-start gap-2 text-xs text-gray-200">
                <input type="checkbox" checked={notOthers} onChange={(event) => setNotOthers(event.target.checked)} className="mt-0.5 accent-amber-400" />
                <span>지우는 부분은 다른 사람의 저작권 표시·출처 표시·AI 생성 표시가 아닙니다.</span>
              </label>
              <p className="text-[11px] text-gray-400">실행할 때마다 파일 이름과 시각이 내 기록으로 남고, 30일 뒤 자동으로 지워집니다.</p>
            </div>

            <button
              type="button"
              onClick={() => void run()}
              disabled={!canRun}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2.5 text-sm font-black text-slate-950 shadow-md shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eraser className="h-4 w-4" />
              {status === "working" ? `지우는 중 ${Math.round(progress * 100)}%` : "선택한 곳 지우기"}
            </button>
            {status === "working" && (
              <div className="h-1.5 overflow-hidden rounded-full bg-[#0d1117]">
                <div className="h-full bg-amber-400 transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
            )}
            {!canRun && status !== "working" && (
              <p className="text-[11px] text-gray-400">
                {rects.length === 0 ? "지울 곳을 먼저 그려 주세요." : "위 두 가지를 확인해야 실행할 수 있습니다."}
              </p>
            )}

            <button
              type="button"
              onClick={reset}
              disabled={status === "working"}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#30363d] px-3 py-2 text-xs font-semibold text-gray-300 hover:text-white disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 다른 영상 넣기
            </button>
          </aside>
        </div>
      )}

      {note && <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{note}</p>}

      {result && (
        <section className="space-y-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <div className="text-sm font-bold text-emerald-200">✅ 지우기 완료 · {formatBytes(result.size)}</div>
          <video src={result.url} controls playsInline className="max-h-[50vh] w-full rounded-xl bg-black" />
          <a
            href={result.url}
            download={result.name}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-emerald-400"
          >
            <Download className="h-4 w-4" /> {result.name} 받기
          </a>
          <p className="text-[11px] text-gray-400">마음에 들지 않으면 사각형을 고치고 다시 눌러 주세요. 원본 파일은 바뀌지 않습니다.</p>
        </section>
      )}
    </div>
  );
}
