"use client";

import { useMemo, useRef, useState } from "react";
import { BookOpen, Download, Eye, FileVideo, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

type Job = { id: string; name: string; size: number; file?: File; status: "ready" | "processing" | "done" | "error"; progress: number; outputSize?: number; error?: string; downloadUrl?: string };
const MAX_FILES = 20;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPT = ".mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.m4v,.ts";
const STATUS_LABEL: Record<Job["status"], string> = { ready: "변환 준비", processing: "변환 중", done: "완료", error: "오류" };
const CORE_VERSION = "0.12.6";
const CORE_BASE_URL = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/umd`;

// 화질 단계 사다리 — 원본 해상도부터 시작해서 결과 GIF가 8MiB 밑으로 내려갈 때까지
// 해상도/색상 수를 단계적으로 낮춘다. 이전에 Render 워커에서 쓰던 것과 동일한 값이다.
const CANDIDATES = [
  { scale: 1, colors: 256 }, { scale: 0.94, colors: 256 }, { scale: 0.86, colors: 256 }, { scale: 0.76, colors: 256 },
  { scale: 0.68, colors: 224 }, { scale: 0.6, colors: 192 }, { scale: 0.52, colors: 160 }, { scale: 0.45, colors: 128 },
];
const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;

function formatBytes(bytes: number) { if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`; return `${(bytes / 1024 / 1024).toFixed(2)}MB`; }

export default function ConverterWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fps, setFps] = useState<40 | 50>(40);
  const [width, setWidth] = useState(560);
  const totalBytes = useMemo(() => jobs.reduce((sum, job) => sum + job.size, 0), [jobs]);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const loadingRef = useRef<Promise<FFmpeg> | null>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.size <= MAX_FILE_BYTES && !jobs.some((job) => job.name === file.name && job.size === file.size));
    setJobs((current) => [
      ...current,
      ...incoming.map((file) => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size, status: "ready" as const, progress: 0 })),
    ].slice(0, MAX_FILES));
  }
  function remove(id: string) {
    setJobs((current) => {
      const job = current.find((j) => j.id === id);
      if (job?.downloadUrl) URL.revokeObjectURL(job.downloadUrl);
      return current.filter((j) => j.id !== id);
    });
  }
  function retry(id: string) { setJobs((current) => current.map((job) => job.id === id ? { ...job, status: "ready", progress: 0, error: undefined } : job)); }

  // FFmpeg(WASM)는 사용자 브라우저 안에서 실행된다 — 영상이 서버로 전혀 올라가지 않는다.
  // 코어 파일(약 25~30MB)은 첫 변환 시 한 번만 CDN에서 받아오고, 이후로는 브라우저 캐시를
  // 재사용한다. Vercel/Render를 아예 거치지 않으므로 업로드 용량 제한이나 서버 비용 문제가
  // 없다.
  async function getFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    if (!loadingRef.current) {
      loadingRef.current = (async () => {
        const ffmpeg = new FFmpeg();
        // 브라우저 개발자도구 콘솔에서 실제로 살아있는지(멈춘 게 아닌지) 확인할 수 있도록
        // FFmpeg의 내부 로그를 그대로 흘려보낸다.
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
    setJobs((current) => current.map((j) => j.id === job.id ? { ...j, status: "processing", progress: 1 } : j));
    try {
      const ffmpeg = await getFFmpeg();
      setJobs((current) => current.map((j) => j.id === job.id ? { ...j, progress: 5 } : j));

      const dotIndex = job.file!.name.lastIndexOf(".");
      const ext = dotIndex > -1 ? job.file!.name.slice(dotIndex) : ".mp4";
      const inputName = `input${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(job.file!));

      // 각 화질 단계는 전체 진행률의 10%씩을 차지한다. 그 안에서도 FFmpeg가 실제 처리
      // 비율(0~1)을 실시간으로 알려주는 걸 받아서 막대가 계속 움직이게 한다 — 예전엔 한
      // 단계 안에서 progress를 전혀 안 올려서, 큰 파일은 화면이 멈춘 것처럼 보였다.
      const onProgress = ({ progress: ratio }: { progress: number }, base: number) => {
        const clamped = Math.min(1, Math.max(0, ratio));
        setJobs((current) => current.map((j) => j.id === job.id ? { ...j, progress: Math.min(99, base + clamped * 5) } : j));
      };

      let outputBytes: Uint8Array | null = null;
      for (let index = 0; index < CANDIDATES.length; index++) {
        const candidate = CANDIDATES[index];
        const base = 10 + index * 10;
        setJobs((current) => current.map((j) => j.id === job.id ? { ...j, progress: base } : j));
        const scaledWidth = Math.max(1, Math.floor(width * candidate.scale));

        const paletteHandler = (e: { progress: number }) => onProgress(e, base);
        ffmpeg.on("progress", paletteHandler);
        await ffmpeg.exec(["-i", inputName, "-vf", `fps=${fps},scale=${scaledWidth}:-1:flags=lanczos,palettegen=max_colors=${candidate.colors}:stats_mode=diff`, "palette.png"]);
        ffmpeg.off("progress", paletteHandler);

        const useHandler = (e: { progress: number }) => onProgress(e, base + 5);
        ffmpeg.on("progress", useHandler);
        await ffmpeg.exec(["-i", inputName, "-i", "palette.png", "-lavfi", `fps=${fps},scale=${scaledWidth}:-1:flags=lanczos [x]; [x][1:v] paletteuse=dither=sierra2_4a:diff_mode=rectangle`, "output.gif"]);
        ffmpeg.off("progress", useHandler);

        const data = await ffmpeg.readFile("output.gif");
        const bytes = data as Uint8Array;
        if (bytes.byteLength <= MAX_OUTPUT_BYTES) { outputBytes = bytes; break; }
        outputBytes = bytes;
      }
      await ffmpeg.deleteFile(inputName).catch(() => {});
      await ffmpeg.deleteFile("palette.png").catch(() => {});
      await ffmpeg.deleteFile("output.gif").catch(() => {});

      if (!outputBytes) throw new Error("변환 결과를 읽지 못했습니다.");
      if (outputBytes.byteLength > MAX_OUTPUT_BYTES) throw new Error("8MiB 이하로 최적화하지 못했습니다.");

      const blob = new Blob([outputBytes.slice().buffer], { type: "image/gif" });
      const downloadUrl = URL.createObjectURL(blob);
      setJobs((current) => current.map((j) => j.id === job.id ? { ...j, status: "done", progress: 100, outputSize: blob.size, downloadUrl } : j));
    } catch (error) {
      setJobs((current) => current.map((j) => j.id === job.id ? { ...j, status: "error", error: error instanceof Error ? error.message : "변환에 실패했습니다." } : j));
    }
  }

  async function start() {
    const ready = jobs.filter((job) => job.status === "ready" && job.file);
    if (!ready.length) return;
    // 브라우저 CPU 하나로 순차 처리한다(동시에 여러 개 돌리면 오히려 다 느려짐).
    for (const job of ready) {
      await convertOne(job);
    }
  }

  return <main className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8"><p className="text-sm font-bold text-amber-600">VideoToGIF 작업실</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">영상을 GIF로 변환하세요</h1><p className="mt-2 text-slate-500">영상 길이는 유지하고, 8MiB 안에서 화질을 자동으로 최적화합니다. 변환은 이 브라우저 안에서 처리되어 영상이 서버로 업로드되지 않습니다.</p></div>
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6"><label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-card transition hover:border-amber-400 hover:bg-amber-50/30"><UploadCloud className="mb-4 h-10 w-10 text-amber-500" /><span className="font-bold text-slate-800">영상을 여기에 끌어놓거나 클릭하세요</span><span className="mt-2 text-xs text-slate-400">MP4, MKV, AVI, MOV, WebM 등 · 파일당 200MB · 최대 20개</span><input className="hidden" type="file" accept={ACCEPT} multiple onChange={(event) => addFiles(event.target.files)} /></label>
        <div className="rounded-3xl bg-white p-6 shadow-card"><div className="mb-5 flex items-center justify-between"><h2 className="font-black">변환 작업 <span className="text-amber-500">{jobs.length}</span></h2><span className="text-xs text-slate-400">{formatBytes(totalBytes)}</span></div>{jobs.length === 0 ? <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400"><FileVideo className="mx-auto mb-3 h-8 w-8" />아직 등록한 영상이 없습니다.</div> : <div className="space-y-3">{jobs.map((job, index) => <div key={job.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{job.name}</p><p className="mt-1 text-xs text-slate-400">{formatBytes(job.size)} · {job.status === "done" ? `완료 · ${formatBytes(job.outputSize ?? 0)}` : job.status === "error" ? (job.error ?? "오류") : STATUS_LABEL[job.status]}</p></div>{job.status === "done" && <><a href={job.downloadUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="미리보기"><Eye className="h-4 w-4" /></a><a href={job.downloadUrl ?? "#"} download={`${job.name.replace(/\.[^.]+$/, "")}.gif`} className="rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200" title="다운로드"><Download className="h-4 w-4" /></a></>}{job.status === "error" && <button onClick={() => retry(job.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="재시도"><RotateCcw className="h-4 w-4" /></button>}<button onClick={() => remove(job.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><Trash2 className="h-4 w-4" /></button></div>{job.status === "processing" && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${job.progress}%` }} /></div>}</div>)}</div>}</div></div>
      <aside className="h-fit rounded-3xl bg-slate-950 p-6 text-white shadow-card"><h2 className="font-black">변환 옵션</h2><div className="mt-6 space-y-6"><div><p className="mb-2 text-xs font-bold text-slate-400">프레임레이트</p><div className="grid grid-cols-2 gap-2">{([40, 50] as const).map((value) => <button key={value} onClick={() => setFps(value)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${fps === value ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/15 text-slate-300"}`}>{value}fps</button>)}</div></div><div><div className="mb-2 flex justify-between text-xs font-bold text-slate-400"><span>출력 너비</span><span className="text-amber-300">{width}px</span></div><input className="w-full accent-amber-400" type="range" min="160" max="800" step="40" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-300">용량이 8MiB를 넘으면 영상 길이를 자르지 않고 해상도와 색상 수를 단계적으로 낮춥니다. 변환은 이 기기에서 직접 처리되며, 첫 변환 시 엔진을 한 번 내려받습니다.</div><button onClick={start} disabled={!jobs.some((job) => job.status === "ready")} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">변환 시작</button></div></aside>
    </section>

    <section className="mt-8 rounded-3xl bg-white p-6 shadow-card sm:p-8">
      <div className="mb-5 flex items-center gap-2"><BookOpen className="h-5 w-5 text-amber-500" /><h2 className="text-lg font-black text-slate-900">사용 매뉴얼</h2></div>
      <div className="grid gap-8 md:grid-cols-3">
        <div>
          <h3 className="mb-3 text-sm font-black text-slate-800">사용 방법</h3>
          <ol className="space-y-2 text-sm leading-6 text-slate-600">
            <li><span className="font-bold text-amber-600">1.</span> 위 박스에 영상을 끌어놓거나 클릭해서 선택합니다.</li>
            <li><span className="font-bold text-amber-600">2.</span> 오른쪽에서 프레임레이트(40/50fps)와 출력 너비(160~800px)를 설정합니다.</li>
            <li><span className="font-bold text-amber-600">3.</span> &quot;변환 시작&quot;을 누릅니다 — 첫 변환 시 엔진(25~30MB)을 한 번 받아옵니다.</li>
            <li><span className="font-bold text-amber-600">4.</span> 완료되면 뜨는 👁 미리보기 / ⬇ 다운로드 버튼으로 바로 저장합니다.</li>
          </ol>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black text-slate-800">제한사항</h3>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>파일당 최대 <b>200MB</b> (기기 메모리 안전값)</li>
            <li>한 번에 최대 <b>20개</b> 파일, 순서대로 하나씩 처리</li>
            <li>결과 GIF는 <b>8MiB 이하</b>로 자동 최적화(해상도·색상 수를 단계적으로 낮춤, 길이는 그대로 유지)</li>
            <li>프레임레이트 40/50fps, 출력 너비 160~800px 중 선택</li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black text-slate-800">주의사항</h3>
          <ul className="space-y-2 text-sm leading-6 text-slate-600">
            <li>변환은 <b>이 브라우저 안에서</b> 처리되어 영상이 서버로 업로드되지 않습니다.</li>
            <li>결과물은 <b>서버에 저장되지 않습니다</b> — 변환 즉시 다운로드해야 하며, 새로고침하거나 페이지를 벗어나면 사라집니다.</li>
            <li>변환 중에는 탭을 닫거나 새로고침하지 마세요 — 진행 중인 작업이 그대로 사라집니다.</li>
            <li>처리 속도는 <b>사용 중인 PC/스마트폰 성능</b>에 좌우됩니다 — 저사양 기기는 오래 걸리거나 큰 영상에서 실패할 수 있습니다.</li>
            <li>변환 이력(과거 작업 목록)은 따로 저장되지 않습니다.</li>
          </ul>
        </div>
      </div>
    </section>
  </main>;
}
