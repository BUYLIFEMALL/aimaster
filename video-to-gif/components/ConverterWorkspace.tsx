"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Film,
  Download,
  Eye,
  FileVideo,
  RotateCcw,
  Trash2,
  UploadCloud,
  Sparkles,
  Zap,
  ShieldCheck,
  Cpu,
  BookOpen,
  ArrowRight,
  Layers,
  CheckCircle2,
  X,
  Play
} from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type Job = {
  id: string;
  name: string;
  size: number;
  file?: File;
  status: "ready" | "processing" | "done" | "error";
  progress: number;
  outputSize?: number;
  error?: string;
  downloadUrl?: string;
};

const MAX_FILES = 20;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPT = ".mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.m4v,.ts";
const STATUS_LABEL: Record<Job["status"], string> = {
  ready: "변환 준비",
  processing: "WASM 인코딩 중",
  done: "변환 완료",
  error: "오류 발생"
};
const CORE_VERSION = "0.12.6";
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

// 화질 단계 사다리 — 원본 해상도부터 시작해서 결과 GIF가 8MiB 밑으로 내려갈 때까지
// 해상도/색상 수를 단계적으로 낮춘다.
const CANDIDATES = [
  { scale: 1, colors: 256 },
  { scale: 0.94, colors: 256 },
  { scale: 0.86, colors: 256 },
  { scale: 0.76, colors: 256 },
  { scale: 0.68, colors: 224 },
  { scale: 0.6, colors: 192 },
  { scale: 0.52, colors: 160 },
  { scale: 0.45, colors: 128 },
];
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function ConverterWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fps, setFps] = useState<40 | 50>(40);
  const [width, setWidth] = useState(560);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  const totalBytes = useMemo(() => jobs.reduce((sum, job) => sum + job.size, 0), [jobs]);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadingRef = useRef<Promise<FFmpeg> | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter(
      (file) => file.size <= MAX_FILE_BYTES && !jobs.some((job) => job.name === file.name && job.size === file.size)
    );
    setJobs((current) => [
      ...current,
      ...incoming.map((file) => ({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        size: file.size,
        status: "ready" as const,
        progress: 0
      })),
    ].slice(0, MAX_FILES));
  }

  function remove(id: string) {
    setJobs((current) => {
      const job = current.find((j) => j.id === id);
      if (job?.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
      return current.filter((j) => j.id !== id);
    });
    if (previewJob?.id === id) setPreviewJob(null);
  }

  function retry(id: string) {
    setJobs((current) =>
      current.map((job) => (job.id === id ? { ...job, status: "ready", progress: 0, error: undefined } : job))
    );
  }

  async function getFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        const ffmpeg = new FFmpeg();
        ffmpeg.on("log", ({ message }) => console.log("[ffmpeg]", message));
        await ffmpeg.load({
          coreURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.js`, "text/javascript"),
          wasmURL: await toBlobURL(`${CORE_BASE_URL}/ffmpeg-core.wasm`, "application/wasm"),
        });
        ffmpegRef.current = ffmpeg;
        return ffmpeg;
      })();
    }
    return loadingRef.current;
  }

  async function convertOne(job: Job) {
    setJobs((current) => current.map((j) => (j.id === job.id ? { ...j, status: "processing", progress: 1 } : j)));
    try {
      const ffmpeg = await getFFmpeg();
      setJobs((current) => current.map((j) => (j.id === job.id ? { ...j, progress: 5 } : j)));

      const dotIndex = job.file!.name.lastIndexOf(".");
      const ext = dotIndex > -1 ? job.file!.name.slice(dotIndex) : ".mp4";
      const inputName = `input${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(job.file!));

      const onProgress = ({ progress: ratio }: { progress: number }, base: number) => {
        const clamped = Math.min(1, Math.max(0, ratio));
        setJobs((current) =>
          current.map((j) => (j.id === job.id ? { ...j, progress: Math.min(99, base + clamped * 5) } : j))
        );
      };

      let outputBytes: Uint8Array | null = null;
      for (let index = 0; index < CANDIDATES.length; index++) {
        const candidate = CANDIDATES[index];
        const base = 10 + index * 10;
        setJobs((current) => current.map((j) => (j.id === job.id ? { ...j, progress: base } : j)));
        const scaledWidth = Math.max(1, Math.floor(width * candidate.scale));

        const paletteHandler = (e: { progress: number }) => onProgress(e, base);
        ffmpeg.on("progress", paletteHandler);
        await ffmpeg.exec([
          "-i",
          inputName,
          "-vf",
          `fps=${fps},scale=${scaledWidth}:-1:flags=lanczos,palettegen=max_colors=${candidate.colors}:stats_mode=diff`,
          "palette.png"
        ]);
        ffmpeg.off("progress", paletteHandler);

        const useHandler = (e: { progress: number }) => onProgress(e, base + 5);
        ffmpeg.on("progress", useHandler);
        await ffmpeg.exec([
          "-i",
          inputName,
          "-i",
          "palette.png",
          "-lavfi",
          `fps=${fps},scale=${scaledWidth}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a:diff_mode=rectangle`,
          "output.gif"
        ]);
        ffmpeg.off("progress", useHandler);

        const data = await ffmpeg.readFile("output.gif");
        const bytes = data as Uint8Array;
        if (bytes.byteLength <= MAX_OUTPUT_BYTES) {
          outputBytes = bytes;
          break;
        }
        outputBytes = bytes;
      }

      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile("palette.png").catch(() => {});
      await ffmpeg.deleteFile("output.gif").catch(() => {});

      if (!outputBytes) throw new Error("변환 결과를 읽지 못했습니다.");
      if (outputBytes.byteLength > MAX_OUTPUT_BYTES) throw new Error("8MiB 이하로 최적화하지 못했습니다.");

      const blob = new Blob([outputBytes.slice().buffer], { type: "image/gif" });
      const downloadUrl = URL.createObjectURL(blob);
      setJobs((current) =>
        current.map((j) =>
          j.id === job.id
            ? { ...j, status: "done", progress: 100, outputSize: blob.size, downloadUrl }
            : j
        )
      );
    } catch (error) {
      setJobs((current) =>
        current.map((j) =>
          j.id === job.id
            ? { ...j, status: "error", error: error instanceof Error ? error.message : "변환에 실패했습니다." }
            : j
        )
      );
    }
  }

  async function start() {
    const ready = jobs.filter((job) => job.status === "ready" && job.file);
    if (!ready.length) return;
    for (const job of ready) {
      await convertOne(job);
    }
  }

  const isConverting = jobs.some((j) => j.status === "processing");

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 space-y-8 text-[#f0f6fc]">
      {/* 1. 상단 히어로 스튜디오 배너 */}
      <div className="studio-hero rounded-3xl p-6 sm:p-8 border border-amber-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            이커머스 상세페이지 GIF 랩 v1.10
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>📖 사용 매뉴얼 보기</span>
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-snug">
              동영상을 <span className="text-amber-400">초고화질 8MiB GIF</span>로 즉시 변환하세요
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              재생 길이는 100% 온전히 유지하면서 네이버 스마트스토어와 쿠팡의 8MiB 용량 기준에 맞춰 
              브라우저 WebAssembly로 2-Pass 고화질 팔레트를 자동 생성합니다. (서버 무전송·100% 프라이버시 보호)
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 shrink-0">
            <ShieldCheck className="h-4 w-4" />
            <span>100% Client-Side WASM</span>
          </div>
        </div>
      </div>

      {/* 2. 3대 핵심 KPI 지표 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="kpi-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">엔진 아키텍처</div>
            <div className="text-sm font-extrabold text-white mt-0.5">WASM 2-Pass 고화질</div>
            <div className="text-[11px] text-amber-400 mt-0.5">브라우저 로컬 직접 연산</div>
          </div>
        </div>

        <div className="kpi-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">용량 최적화</div>
            <div className="text-sm font-extrabold text-white mt-0.5">8MiB 지능형 사다리</div>
            <div className="text-[11px] text-emerald-400 mt-0.5">스마트스토어·쿠팡 규격 완벽 대응</div>
          </div>
        </div>

        <div className="kpi-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-gray-400">일괄 대기열</div>
            <div className="text-sm font-extrabold text-white mt-0.5">최대 20개 동시 큐</div>
            <div className="text-[11px] text-cyan-400 mt-0.5">파일당 200MB까지 폭넓게 수용</div>
          </div>
        </div>
      </div>

      {/* 3. 메인 작업 레이아웃: 좌측 드롭존 & 큐 / 우측 옵션 패널 */}
      <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* 좌측: 파일 드롭존 & 큐 리스트 */}
        <div className="space-y-6">
          {/* 드롭존 */}
          <label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#30363d] bg-[#161b22] p-8 text-center transition-all hover:border-amber-400/60 hover:bg-[#1f2937]/50 group">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <UploadCloud className="h-7 w-7" />
            </div>
            <span className="text-base font-bold text-gray-100 group-hover:text-amber-300 transition-colors">
              동영상 파일을 여기에 끌어놓거나 클릭하세요
            </span>
            <span className="mt-2 text-xs text-gray-400">
              MP4, MOV, WEBM, MKV, AVI 등 · 파일당 최대 200MB · 최대 20개 일괄 등록
            </span>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#0d1117] px-3.5 py-1 text-[11px] font-semibold text-gray-400 border border-[#30363d]">
              <Film className="h-3 w-3 text-amber-400" />
              <span>촬영 원본 그대로 드래그하세요</span>
            </div>
            <input
              className="hidden"
              type="file"
              accept={ACCEPT}
              multiple
              onChange={(event) => addFiles(event.target.files)}
            />
          </label>

          {/* 등록된 작업 큐 목록 */}
          <div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">등록된 변환 대기열</h2>
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-400 border border-amber-500/30">
                  {jobs.length}개
                </span>
              </div>
              <span className="text-xs text-gray-400">총 원본 용량: {formatBytes(totalBytes)}</span>
            </div>

            {jobs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#30363d] bg-[#0d1117] py-12 text-center text-xs text-gray-400">
                <FileVideo className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                아직 등록된 동영상이 없습니다. 상단 드롭존에 영상을 추가해 보세요.
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job, index) => (
                  <div
                    key={job.id}
                    className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 transition-colors hover:border-[#484f58]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#161b22] text-xs font-black text-gray-400 border border-[#30363d]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-gray-200">{job.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className="text-gray-400">{formatBytes(job.size)}</span>
                          <span className="text-gray-400">•</span>
                          {job.status === "done" ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              완료 ({formatBytes(job.outputSize ?? 0)})
                            </span>
                          ) : job.status === "error" ? (
                            <span className="text-red-400 font-bold">{job.error ?? "오류"}</span>
                          ) : job.status === "processing" ? (
                            <span className="text-amber-400 font-bold animate-pulse">
                              인코딩 진행 중 ({job.progress}%)
                            </span>
                          ) : (
                            <span className="text-gray-400">{STATUS_LABEL[job.status]}</span>
                          )}
                        </div>
                      </div>

                      {/* 액션 버튼 그룹 */}
                      <div className="flex items-center gap-1.5">
                        {job.status === "done" && (
                          <>
                            <button
                              onClick={() => setPreviewJob(job)}
                              className="rounded-lg border border-[#30363d] bg-[#161b22] p-2 text-gray-300 hover:border-amber-500/40 hover:text-amber-300 transition-colors"
                              title="미리보기"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <a
                              href={job.downloadUrl ?? "#"}
                              download={`${job.name.replace(/\.[^.]+$/, "")}.gif`}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 px-3 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-colors"
                              title="다운로드"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span>다운로드</span>
                            </a>
                          </>
                        )}
                        {job.status === "error" && (
                          <button
                            onClick={() => retry(job.id)}
                            className="rounded-lg border border-[#30363d] bg-[#161b22] p-2 text-gray-300 hover:text-white"
                            title="재시도"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(job.id)}
                          className="rounded-lg border border-[#30363d] bg-[#161b22] p-2 text-gray-400 hover:border-red-500/40 hover:text-red-400 transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* 진행률 바 */}
                    {job.status === "processing" && (
                      <div className="mt-3">
                        <div className="h-2 overflow-hidden rounded-full bg-[#161b22] border border-[#30363d]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-300"
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 우측: 변환 옵션 설정 패널 */}
        <aside className="h-fit rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-[#30363d] pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>변환 옵션 설정</span>
            </h2>
            <span className="text-[11px] text-amber-400 font-semibold">스튜디오 모드</span>
          </div>

          <div className="space-y-5">
            {/* 1. 프레임레이트 */}
            <div>
              <div className="mb-2 flex items-center justify-between text-xs font-bold text-gray-300">
                <span>프레임레이트 (FPS)</span>
                <span className="text-amber-400">{fps} fps</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([40, 50] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setFps(value)}
                    className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-all ${
                      fps === value
                        ? "border-amber-400 bg-amber-500/20 text-amber-300 shadow-sm"
                        : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {value} fps {value === 40 ? "(추천)" : "(고화질)"}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-gray-400 leading-normal">
                일반 제품은 40fps 권장, 세밀한 패션/액체 질감은 50fps 권장
              </p>
            </div>

            {/* 2. 출력 너비 및 프리셋 */}
            <div>
              <div className="mb-2 flex justify-between text-xs font-bold text-gray-300">
                <span>출력 가로폭 (Width)</span>
                <span className="text-amber-300 font-extrabold">{width} px</span>
              </div>
              <input
                className="w-full accent-amber-400 cursor-pointer"
                type="range"
                min="160"
                max="860"
                step="20"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setWidth(560)}
                  className={`rounded-lg border px-2 py-1 font-semibold transition-colors ${
                    width === 560
                      ? "border-amber-400/80 bg-amber-500/20 text-amber-300"
                      : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  기본 560px
                </button>
                <button
                  type="button"
                  onClick={() => setWidth(780)}
                  className={`rounded-lg border px-2 py-1 font-semibold transition-colors ${
                    width === 780
                      ? "border-amber-400/80 bg-amber-500/20 text-amber-300"
                      : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  쿠팡 780px
                </button>
                <button
                  type="button"
                  onClick={() => setWidth(860)}
                  className={`rounded-lg border px-2 py-1 font-semibold transition-colors ${
                    width === 860
                      ? "border-amber-400/80 bg-amber-500/20 text-amber-300"
                      : "border-[#30363d] bg-[#0d1117] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  스토어 860px
                </button>
              </div>
            </div>

            {/* 3. 자동 8MiB 사다리 안내 배너 */}
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs leading-relaxed text-amber-200">
              <div className="font-bold flex items-center gap-1.5 text-amber-300 mb-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>8MiB 지능형 사다리 자동 적용</span>
              </div>
              용량이 8MiB를 초과하면 영상 길이를 임의로 자르지 않고 스케일과 색상 수를 지능적으로 낮춰 안정적으로 통과시킵니다.
            </div>

            {/* 4. 변환 실행 버튼 */}
            <button
              onClick={start}
              disabled={isConverting || !jobs.some((job) => job.status === "ready")}
              className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3.5 font-black text-slate-950 transition-all hover:from-amber-400 hover:to-amber-500 disabled:cursor-not-allowed disabled:opacity-40 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
            >
              {isConverting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>WASM 변환 인코딩 중...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-slate-950" />
                  <span>변환 시작 ({jobs.filter((j) => j.status === "ready").length}개 대기)</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </section>

      {/* 4. 하단 상세페이지 GIF 실전 활용 3대 팁 안내 섹션 */}
      <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">상세페이지 GIF 실전 활용 가이드</h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
            <h3 className="text-sm font-bold text-amber-300 mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-[10px]">1</span>
              스마트스토어 본문 최적화
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              네이버 스마트스토어 에디터에 GIF를 삽입할 때는 가로폭 860px로 설정하는 것이 가장 선명하게 렌더링되며, 8MiB 이내로 등록 시 모바일 앱에서도 버벅임 없이 즉각 로딩됩니다.
            </p>
          </div>

          <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
            <h3 className="text-sm font-bold text-cyan-300 mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-[10px]">2</span>
              쿠팡 상세페이지 로딩 순위
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              쿠팡은 이미지/GIF 용량이 10MB를 넘어가면 모바일 이탈률이 급증합니다. 780px 가로폭과 40fps 설정으로 5~7MB 수준의 고화질 GIF를 제작하여 체류 시간을 극대화하세요.
            </p>
          </div>

          <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-5">
            <h3 className="text-sm font-bold text-emerald-300 mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px]">3</span>
              100% 브라우저 메모리 보관
            </h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              변환된 GIF는 서버에 영구 저장되지 않고 브라우저 탭 메모리에만 임시 보관됩니다. 변환이 완료되면 즉시 다운로드 버튼을 눌러 로컬 PC에 저장하시기 바랍니다.
            </p>
          </div>
        </div>
      </section>

      {/* 5. GIF 인라인 미리보기 모달 */}
      {previewJob && previewJob.downloadUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <Film className="h-4 w-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white truncate max-w-md">{previewJob.name} 미리보기</h3>
              </div>
              <button
                onClick={() => setPreviewJob(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#30363d] text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl bg-[#0d1117] p-4 border border-[#30363d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewJob.downloadUrl}
                alt={previewJob.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-lg"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <div className="text-xs text-gray-300 whitespace-nowrap">
                결과 용량: <span className="font-bold text-emerald-400">{formatBytes(previewJob.outputSize ?? 0)}</span>
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap">
                <button
                  onClick={() => setPreviewJob(null)}
                  className="rounded-xl border border-[#30363d] px-4 py-2 text-xs font-semibold text-gray-300 hover:bg-[#1f2937]"
                >
                  닫기
                </button>
                <a
                  href={previewJob.downloadUrl}
                  download={`${previewJob.name.replace(/\.[^.]+$/, "")}.gif`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>다운로드</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
