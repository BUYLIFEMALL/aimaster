"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListOrdered, Loader2, Play, RotateCcw, Trash2, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useQueue } from "@/components/engine/useQueue";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { EngineError, QUEUE_LABEL, activeCount, cancelJob, dismissJob, fetchLibraryFile, rerunJob, type QueueJob, type QueueStatus } from "@/lib/engine";
import { KIND_LABEL } from "@/lib/tracks";

const TONE: Record<QueueStatus, string> = {
  queued: "border-slate-600 text-slate-300",
  running: "border-teal-400/60 text-teal-200",
  done: "border-emerald-500/50 text-emerald-300",
  failed: "border-rose-500/50 text-rose-300",
  cancelled: "border-slate-700 text-slate-500",
  interrupted: "border-amber-500/50 text-amber-300",
};

const time = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function QueuePage() {
  const { engine, supported, jobs, refresh } = useQueue(3000);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [audio, setAudio] = useState<Record<string, string>>({});
  const urls = useRef<string[]>([]);
  useEffect(() => () => urls.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const act = async (id: string, fn: () => Promise<void>) => {
    setBusy(id);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof EngineError ? e.message : "처리하지 못했습니다.");
    } finally {
      setBusy("");
    }
  };

  const play = (job: QueueJob) =>
    act(job.id, async () => {
      const { url } = await fetchLibraryFile(job.track.id);
      urls.current.push(url);
      setAudio((a) => ({ ...a, [job.id]: url }));
    });

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const finished = jobs.filter((j) => !(j.status === "queued" || j.status === "running")).reverse();

  const row = (j: QueueJob, i?: number) => (
    <li key={j.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {i !== undefined && <span className="font-mono text-slate-500">{i + 1}.</span>}
        <span className="font-semibold text-slate-100">{j.title}</span>
        {KIND_LABEL[j.kind] && <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{KIND_LABEL[j.kind]}</span>}
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE[j.status]}`}>
          {j.status === "running" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
          {QUEUE_LABEL[j.status]}
        </span>
        <span className="text-[11px] text-slate-500">
          {j.track.duration_sec}초 · 넣은 시각 {time(j.createdAt)}
          {j.finishedAt ? ` · 끝난 시각 ${time(j.finishedAt)}` : ""}
        </span>
        <span className="ml-auto flex flex-wrap items-center gap-1.5">
          {(j.status === "queued" || j.status === "running") && (
            <button type="button" disabled={busy === j.id} onClick={() => act(j.id, () => cancelJob(j.id))} className="inline-flex items-center gap-1 rounded-lg border border-slate-600 px-2.5 py-1.5 text-[11px] text-slate-300 hover:bg-slate-900 disabled:opacity-40">
              <X className="h-3 w-3" /> 취소
            </button>
          )}
          {(j.status === "interrupted" || j.status === "failed") && (
            <button type="button" disabled={busy === j.id} onClick={() => act(j.id, () => rerunJob(j.id))} className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-amber-200 hover:bg-amber-950/40 disabled:opacity-40">
              <RotateCcw className="h-3 w-3" /> 다시 하기
            </button>
          )}
          {j.status === "done" && !audio[j.id] && (
            <button type="button" disabled={busy === j.id} onClick={() => play(j)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40">
              <Play className="h-3 w-3" /> 듣기
            </button>
          )}
          {j.status === "done" && <DownloadButtons trackId={j.track.id} title={j.title} ext={j.result?.ext ?? "mp3"} ffmpeg={!!engine.status?.quality?.ffmpeg} onError={setError} />}
          {!(j.status === "queued" || j.status === "running") && (
            <button type="button" aria-label="목록에서 지우기" title="목록에서만 지웁니다(만든 음원은 보관함에 그대로)" disabled={busy === j.id} onClick={() => act(j.id, () => dismissJob(j.id))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-900 hover:text-rose-300 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {j.status === "running" && <p className="text-[11px] text-teal-200/80">{j.stage}</p>}
      {j.error && <p className="text-[11px] text-rose-300/90">이유: {j.error}</p>}
      {j.status === "interrupted" && <p className="text-[11px] text-amber-300/80">엔진이 꺼져 만들다 멈췄습니다. [다시 하기]를 누르면 같은 내용으로 다시 만듭니다.</p>}
      {j.status === "done" && (
        <p className={`text-[11px] ${j.recorded ? "text-emerald-300/80" : "text-slate-500"}`}>
          {j.recorded ? (
            <>
              ✔ 내 PC 보관함에 저장 · <Link href="/library" className="underline underline-offset-2">모든 음악</Link>에 기록됨
            </>
          ) : (
            "내 PC 보관함에 저장 · 모든 음악에 기록하는 중…"
          )}
        </p>
      )}
      {audio[j.id] && <audio controls autoPlay src={audio[j.id]} className="w-full" />}
    </li>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-[#0a0f1d] via-[#0b1a18] to-[#070b14] p-6 shadow-xl">
        <div className="flex items-center gap-2.5">
          <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2 text-emerald-400">
            <ListOrdered className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-100">📋 작업 대기열</h1>
            <p className="mt-0.5 text-xs text-slate-400">
              곡 만들기·가져온 음악에서 넣은 작업을 내 PC 엔진이 하나씩 차례로 만듭니다. 이 창을 닫아도 엔진이 계속 만들고, 다시 들어오면 완성된 곡이 「모든 음악」에 기록됩니다.
            </p>
          </div>
        </div>
      </div>

      {!supported ? (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-xs text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {engine.checking
              ? "엔진을 확인하는 중…"
              : !engine.online
                ? "내 PC 엔진이 꺼져 있습니다. 엔진을 켜면 대기열이 보입니다."
                : !engine.paired
                  ? "이 브라우저를 엔진과 연결해야 합니다."
                  : "지금 엔진은 작업 대기열이 없는 옛 버전입니다. 엔진 0.1.6 이상으로 바꿔 주세요."}{" "}
            <Link href="/engine" className="font-semibold underline underline-offset-2">
              내 PC 엔진 화면
            </Link>
          </p>
        </div>
      ) : (
        <>
          {error && (
            <p className="flex items-center gap-2 text-xs font-semibold text-rose-300">
              <AlertCircle className="h-4 w-4" /> {error}
            </p>
          )}
          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
              <Clock className="h-4 w-4 text-teal-300" /> 대기·진행 {activeCount(jobs)}개
              <span className="text-[11px] font-normal text-slate-400">{engine.ready ? `엔진 준비됨 · ${engine.status?.mode}` : `엔진 ${engine.status?.stage ?? ""} — 준비되면 이어서 만듭니다`}</span>
            </h2>
            {active.length === 0 ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-500">
                기다리는 작업이 없습니다. <Link href="/songs" className="text-emerald-300 underline underline-offset-2">곡 만들기</Link>에서 [대기열에 넣기]를 눌러 주세요.
              </p>
            ) : (
              <ol className="space-y-2">{active.map((j, i) => row(j, i))}</ol>
            )}
          </section>
          {finished.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 끝난 작업 {finished.length}개
                <span className="text-[11px] font-normal text-slate-400">최근 100개까지 남습니다</span>
              </h2>
              <ul className="space-y-2">{finished.map((j) => row(j))}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
