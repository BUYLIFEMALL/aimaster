"use client";

import { useMemo, useState } from "react";
import { Download, Eye, FileVideo, RotateCcw, Trash2, UploadCloud } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Job = { id: string; name: string; size: number; file?: File; status: "ready" | "uploading" | "queued" | "processing" | "done" | "error"; progress: number; outputSize?: number; error?: string; downloadUrl?: string };
const MAX_FILES = 20;
const MAX_FILE_BYTES = 200 * 1024 * 1024;
const ACCEPT = ".mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.m4v,.ts";
const STATUS_LABEL: Record<Job["status"], string> = { ready: "변환 준비", uploading: "업로드 중", queued: "대기 중", processing: "변환 중", done: "완료", error: "오류" };

function formatBytes(bytes: number) { if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`; return `${(bytes / 1024 / 1024).toFixed(2)}MB`; }

export default function ConverterWorkspace() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [fps, setFps] = useState<40 | 50>(40);
  const [width, setWidth] = useState(560);
  const totalBytes = useMemo(() => jobs.reduce((sum, job) => sum + job.size, 0), [jobs]);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const incoming = Array.from(files).filter((file) => file.size <= MAX_FILE_BYTES && !jobs.some((job) => job.name === file.name && job.size === file.size));
    setJobs((current) => [
      ...current,
      ...incoming.map((file) => ({ id: crypto.randomUUID(), file, name: file.name, size: file.size, status: "ready" as const, progress: 0 })),
    ].slice(0, MAX_FILES));
  }
  function remove(id: string) { setJobs((current) => current.filter((job) => job.id !== id)); }
  function retry(id: string) { setJobs((current) => current.map((job) => job.id === id ? { ...job, status: "ready", progress: 0, error: undefined } : job)); }

  // 파일은 Vercel API를 거치지 않고 브라우저에서 Supabase Storage(videotogif-uploads)로
  // 직접 올린다 — Vercel Functions의 요청 본문 100MB 제한을 우회하기 위함. API에는
  // 업로드가 끝난 뒤의 저장 경로(문자열)만 보낸다.
  async function start() {
    const ready = jobs.filter((job) => job.status === "ready" && job.file);
    if (!ready.length) return;
    setJobs((current) => current.map((job) => job.status === "ready" ? { ...job, status: "uploading" } : job));

    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setJobs((current) => current.map((job) => ready.some((item) => item.id === job.id) ? { ...job, status: "error", error: "로그인이 필요합니다." } : job));
      return;
    }
    // 쿠키 기반 로그인 판정이 갱신 타이밍 때문에 실패할 수 있어서(§lib/access.ts 참고),
    // API 호출에는 이 액세스 토큰을 직접 실어 보낸다.
    const accessToken = session.access_token;

    const uploaded: Array<{ localId: string; storagePath: string; name: string; size: number }> = [];
    for (const job of ready) {
      // 원본 파일명을 저장 경로에 그대로 쓰면 대괄호·쉼표 등 Supabase Storage가 거부하는
      // 문자가 섞여 있을 때 "Invalid key" 오류가 난다. 경로는 UUID + 확장자만 쓰고,
      // 사람이 읽는 원래 파일명은 name 필드로 별도 전달한다(DB의 original_name, 다운로드
      // 파일명은 이미 그쪽을 쓰고 있어서 영향 없음).
      const dotIndex = job.file!.name.lastIndexOf(".");
      const ext = dotIndex > -1 ? job.file!.name.slice(dotIndex) : "";
      const storagePath = `${user.id}/${crypto.randomUUID()}${ext}`;
      const { error } = await supabase.storage.from("videotogif-uploads").upload(storagePath, job.file!, { contentType: job.file!.type || undefined });
      if (error) {
        setJobs((current) => current.map((j) => j.id === job.id ? { ...j, status: "error", error: `업로드 실패: ${error.message}` } : j));
        continue;
      }
      uploaded.push({ localId: job.id, storagePath, name: job.name, size: job.size });
    }
    if (!uploaded.length) return;

    setJobs((current) => current.map((job) => uploaded.some((u) => u.localId === job.id) ? { ...job, status: "queued" } : job));

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fps, width, files: uploaded.map(({ storagePath, name, size }) => ({ storagePath, name, size })) }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "변환 요청에 실패했습니다.");
      for (const serverJob of payload.jobs as Array<{ jobId: string; name: string }>) {
        const local = uploaded.find((u) => u.name === serverJob.name);
        if (!local) continue;
        setJobs((current) => current.map((job) => job.id === local.localId ? { ...job, id: serverJob.jobId, status: "processing", progress: 1 } : job));
        // EventSource는 커스텀 헤더를 못 붙이므로 토큰을 쿼리스트링으로 넘긴다.
        const events = new EventSource(`/api/convert/${serverJob.jobId}/progress?token=${encodeURIComponent(accessToken)}`);
        events.onmessage = async (event) => { const update = JSON.parse(event.data) as { status: Job["status"]; progress_percent: number; progress_message?: string; file_size_bytes?: number; error_message?: string }; setJobs((current) => current.map((job) => job.id === serverJob.jobId ? { ...job, status: update.status, progress: update.progress_percent, outputSize: update.file_size_bytes, error: update.error_message } : job)); if (update.status === "done" || update.status === "error") { events.close(); if (update.status === "done") { const detail = await fetch(`/api/convert/${serverJob.jobId}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then((res) => res.json()); setJobs((current) => current.map((job) => job.id === serverJob.jobId ? { ...job, downloadUrl: detail.downloadUrl } : job)); } } };
        events.onerror = () => events.close();
      }
    } catch (error) {
      setJobs((current) => current.map((job) => uploaded.some((u) => u.localId === job.id) ? { ...job, status: "error", error: error instanceof Error ? error.message : "변환 요청 실패" } : job));
    }
  }

  return <main className="mx-auto max-w-6xl px-6 py-10"><div className="mb-8"><p className="text-sm font-bold text-amber-600">VideoToGIF 작업실</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">영상을 GIF로 변환하세요</h1><p className="mt-2 text-slate-500">영상 길이는 유지하고, 8MiB 안에서 화질을 자동으로 최적화합니다.</p></div>
    <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6"><label className="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center shadow-card transition hover:border-amber-400 hover:bg-amber-50/30"><UploadCloud className="mb-4 h-10 w-10 text-amber-500" /><span className="font-bold text-slate-800">영상을 여기에 끌어놓거나 클릭하세요</span><span className="mt-2 text-xs text-slate-400">MP4, MKV, AVI, MOV, WebM 등 · 파일당 200MB · 최대 20개</span><input className="hidden" type="file" accept={ACCEPT} multiple onChange={(event) => addFiles(event.target.files)} /></label>
        <div className="rounded-3xl bg-white p-6 shadow-card"><div className="mb-5 flex items-center justify-between"><h2 className="font-black">변환 작업 <span className="text-amber-500">{jobs.length}</span></h2><span className="text-xs text-slate-400">{formatBytes(totalBytes)} / 1GiB</span></div>{jobs.length === 0 ? <div className="rounded-2xl bg-slate-50 py-12 text-center text-sm text-slate-400"><FileVideo className="mx-auto mb-3 h-8 w-8" />아직 등록한 영상이 없습니다.</div> : <div className="space-y-3">{jobs.map((job, index) => <div key={job.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-center gap-3"><span className="text-xs font-bold text-slate-400">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-800">{job.name}</p><p className="mt-1 text-xs text-slate-400">{formatBytes(job.size)} · {job.status === "done" ? `완료 · ${formatBytes(job.outputSize ?? 0)}` : job.status === "error" ? (job.error ?? "오류") : STATUS_LABEL[job.status]}</p></div>{job.status === "done" && <><a href={job.downloadUrl} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="미리보기"><Eye className="h-4 w-4" /></a><a href={job.downloadUrl ?? "#"} download className="rounded-lg bg-amber-100 p-2 text-amber-700 hover:bg-amber-200" title="다운로드"><Download className="h-4 w-4" /></a></>}{job.status === "error" && <button onClick={() => retry(job.id)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="재시도"><RotateCcw className="h-4 w-4" /></button>}<button onClick={() => remove(job.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500" title="삭제"><Trash2 className="h-4 w-4" /></button></div>{(job.status === "uploading" || job.status === "processing" || job.status === "queued") && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${job.status === "uploading" ? 100 : job.progress}%` }} /></div>}</div>)}</div>}</div></div>
      <aside className="h-fit rounded-3xl bg-slate-950 p-6 text-white shadow-card"><h2 className="font-black">변환 옵션</h2><div className="mt-6 space-y-6"><div><p className="mb-2 text-xs font-bold text-slate-400">프레임레이트</p><div className="grid grid-cols-2 gap-2">{([40, 50] as const).map((value) => <button key={value} onClick={() => setFps(value)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${fps === value ? "border-amber-400 bg-amber-400 text-slate-950" : "border-white/15 text-slate-300"}`}>{value}fps</button>)}</div></div><div><div className="mb-2 flex justify-between text-xs font-bold text-slate-400"><span>출력 너비</span><span className="text-amber-300">{width}px</span></div><input className="w-full accent-amber-400" type="range" min="160" max="800" step="40" value={width} onChange={(event) => setWidth(Number(event.target.value))} /></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-300">용량이 8MiB를 넘으면 영상 길이를 자르지 않고 해상도와 색상 수를 단계적으로 낮춥니다.</div><button onClick={start} disabled={!jobs.some((job) => job.status === "ready")} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40">변환 시작</button></div></aside>
    </section>
  </main>;
}
