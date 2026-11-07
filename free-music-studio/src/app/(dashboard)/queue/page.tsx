"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ListOrdered, Loader2, Play, RotateCcw, Trash2, X, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useQueue } from "@/components/engine/useQueue";
import { DownloadButtons } from "@/components/engine/DownloadButtons";
import { StageProgress } from "@/components/engine/StageProgress";
import { EngineError, LICENSE_LABEL, QUEUE_LABEL, activeCount, engineInfo, cancelJob, dismissJob, fetchLibraryFile, rerunJob, type QueueJob, type QueueStatus } from "@/lib/engine";
import { KIND_LABEL, type Track } from "@/lib/tracks";
import { COLLECTIONS_CHANGED, type Collection } from "@/lib/collections";
import { QueueFiling } from "@/components/engine/QueueFiling";

const TONE: Record<QueueStatus, string> = {
  queued: "border-slate-600 text-slate-300",
  running: "border-teal-400/60 text-teal-200",
  done: "border-emerald-500/50 text-emerald-300",
  failed: "border-rose-500/50 text-rose-300",
  cancelled: "border-slate-700 text-slate-500",
  interrupted: "border-amber-500/50 text-amber-300",
};

const lengthLabel = (s: number) => (s < 60 ? `${s}초` : s % 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s / 60}분`);
/** 곡을 만드는 데 걸린 시간(엔진이 일을 시작한 때부터, 처음 받는 모델 시간 포함) */
const elapsedLabel = (from: string, to?: string) => {
  const s = Math.max(0, Math.round(((to ? new Date(to).getTime() : Date.now()) - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}시간 ${m}분` : m ? `${m}분 ${s % 60}초` : `${s}초`;
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

  // 끝난 곡을 바로 프로젝트·플레이리스트로(v1.31) — 묶음 목록과 곡마다 지금 프로젝트
  const [projects, setProjects] = useState<Collection[]>([]);
  const [playlists, setPlaylists] = useState<Collection[]>([]);
  const [projectOf, setProjectOf] = useState<Record<string, string | null>>({});
  const [notice, setNotice] = useState("");
  const recordedCount = jobs.filter((j) => j.recorded).length;
  useEffect(() => {
    const loadCols = () =>
      fetch("/api/collections")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => d && (setProjects(d.projects ?? []), setPlaylists(d.playlists ?? [])))
        .catch(() => {});
    loadCols();
    window.addEventListener(COLLECTIONS_CHANGED, loadCols);
    return () => window.removeEventListener(COLLECTIONS_CHANGED, loadCols);
  }, []);
  useEffect(() => {
    fetch("/api/tracks")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { tracks?: Track[] } | null) => d && setProjectOf(Object.fromEntries((d.tracks ?? []).map((t) => [t.id, t.project_id]))))
      .catch(() => {});
  }, [recordedCount]);
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const active = jobs.filter((j) => j.status === "queued" || j.status === "running");
  const finished = jobs.filter((j) => !(j.status === "queued" || j.status === "running")).reverse();

  const row = (j: QueueJob, i?: number) => (
    <li key={j.id} className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        {i !== undefined && <span className="font-mono text-slate-500">{i + 1}.</span>}
        <span className="font-semibold text-slate-100">{j.title}</span>
        {(() => { const label = j.kind === "stems" ? "Stem 분리" : j.kind === "align" ? "가사 시간" : j.kind === "art" ? "내 PC 그림" : KIND_LABEL[j.kind as keyof typeof KIND_LABEL]; return label ? <span className="rounded-md border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-400">{label}</span> : null; })()}
        {j.engine && j.engine !== "acestep" && (
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${engineInfo(j.engine).license === "noncommercial" ? "bg-amber-500/15 text-amber-200" : "bg-emerald-500/15 text-emerald-200"}`}
            title={engineInfo(j.engine).terms ?? engineInfo(j.engine).desc}
          >
            {engineInfo(j.engine).name} · {LICENSE_LABEL[engineInfo(j.engine).license]}
          </span>
        )}
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TONE[j.status]}`}>
          {j.status === "running" && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
          {QUEUE_LABEL[j.status]}
        </span>
        <span className="text-[11px] text-slate-500">
          <span title="곡을 넣을 때 요청한 길이입니다. 엔진에 따라 실제 곡 길이는 조금 다를 수 있습니다.">요청 길이 {lengthLabel(j.track.duration_sec)}</span> · 넣은 시각 {time(j.createdAt)}
          {j.finishedAt ? ` · 끝난 시각 ${time(j.finishedAt)}` : ""}
        </span>
        {j.startedAt && (j.status === "running" || j.status === "done") && (
          <span
            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${j.status === "running" ? "bg-sky-500/15 text-sky-200" : "bg-violet-500/15 text-violet-200"}`}
            title="엔진이 이 곡을 만들기 시작한 때부터 잰 시간입니다. 그 엔진을 처음 쓸 때는 모델 받는 시간도 들어 있습니다."
          >
            <Clock className="h-3 w-3" />
            {j.status === "running" ? `지금까지 ${elapsedLabel(j.startedAt)}` : `걸린 시간 ${elapsedLabel(j.startedAt, j.finishedAt)}`}
          </span>
        )}
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
          {j.status === "done" && j.kind !== "stems" && j.kind !== "align" && j.kind !== "art" && !audio[j.id] && (
            <button type="button" disabled={busy === j.id} onClick={() => play(j)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-950/40 disabled:opacity-40">
              <Play className="h-3 w-3" /> 듣기
            </button>
          )}
          {j.status === "done" && j.kind !== "stems" && j.kind !== "align" && j.kind !== "art" && <DownloadButtons trackId={j.track.id} title={j.title} ext={j.result?.ext ?? "mp3"} ffmpeg={!!engine.status?.quality?.ffmpeg} onError={setError} />}
          {!(j.status === "queued" || j.status === "running") && (
            <button type="button" aria-label="목록에서 지우기" title="목록에서만 지웁니다(만든 음원은 보관함에 그대로)" disabled={busy === j.id} onClick={() => act(j.id, () => dismissJob(j.id))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-900 hover:text-rose-300 disabled:opacity-40">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </span>
      </div>
      {j.status === "running" && <StageProgress stage={j.stage} />}
      {j.error && <p className="text-[11px] text-rose-300/90">이유: {j.error}</p>}
      {j.status === "interrupted" && <p className="text-[11px] text-amber-300/80">엔진이 꺼져 만들다 멈췄습니다. [다시 하기]를 누르면 같은 내용으로 다시 만듭니다.</p>}
      {j.status === "done" && j.kind === "stems" && (
        <p className="text-[11px] text-emerald-300/80">
          ✔ 노래 저장 폴더 「Stem」에 저장 · <Link href="/library" className="underline underline-offset-2">모든 음악</Link>에서 원곡 「…」 → 「Stem 분리」로 듣고 내려받기
        </p>
      )}
      {j.status === "done" && j.kind === "art" && (
        <p className="text-[11px] text-emerald-300/80">
          ✔ 내 PC에서 그렸습니다{j.result?.model ? ` · ${j.result.model}` : ""}{typeof j.result?.seconds === "number" ? ` · ${j.result.seconds}초` : ""} · 곡 만들기 화면의 「앨범 그림 만들기」에서 미리 보고 저장합니다(하루 보관)
        </p>
      )}
      {j.status === "done" && j.kind === "align" && (
        <p className="text-[11px] text-emerald-300/80">
          ✔ 원곡의 가사 시간에 저장{typeof j.result?.review === "number" && j.result.review > 0 ? ` · 확인 필요 ${j.result.review}줄` : ""} · <Link href="/library" className="underline underline-offset-2">모든 음악</Link> 곡 상세 「가사 시간」에서 확인
        </p>
      )}
      {j.status === "done" && j.kind !== "stems" && j.kind !== "align" && j.kind !== "art" && (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] ${j.recorded ? "text-emerald-300/80" : "text-slate-500"}`}>
          {j.recorded ? (
            <>
              <span>
                ✔ 내 PC 보관함에 저장 · <Link href="/library" className="underline underline-offset-2">모든 음악</Link>에 기록됨
              </span>
              <QueueFiling
                trackId={j.track.id}
                projectId={projectOf[j.track.id]}
                projects={projects}
                playlists={playlists}
                busy={busy === j.id}
                onProject={(p) => setProjectOf((m) => ({ ...m, [j.track.id]: p }))}
                onNotice={setNotice}
                onError={setError}
              />
            </>
          ) : (
            "내 PC 보관함에 저장 · 모든 음악에 기록하는 중…"
          )}
        </div>
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
          {notice && (
            <p role="status" className="sticky top-2 z-10 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/80 px-3 py-2 text-xs font-semibold text-emerald-200">
              <CheckCircle2 className="h-4 w-4" /> {notice}
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
              /* 번호는 엔진이 만드는 전체 순서 그대로(묶음으로 나눠도 바뀌지 않음) */
              byKind(active.map((j, i) => ({ j, i }))).map((g) => (
                <div key={g.key} className="space-y-2">
                  <KindHeading kind={g.key} count={g.list.length} />
                  <ol className="space-y-2">{g.list.map(({ j, i }) => row(j, i))}</ol>
                </div>
              ))
            )}
          </section>
          {finished.length > 0 && (
            <section className="space-y-2">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" /> 끝난 작업 {finished.length}개
                <span className="text-[11px] font-normal text-slate-400">최근 100개까지 남습니다</span>
              </h2>
              {byKind(finished.map((j) => ({ j }))).map((g) => (
                <div key={g.key} className="space-y-2">
                  <KindHeading kind={g.key} count={g.list.length} />
                  <ul className="space-y-2">{g.list.map(({ j }) => row(j))}</ul>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// 음악 작업 / 그림 작업으로 나눠 보이기(2026-11-07 주인님 「여기도 음악과 이미지를 그룹 분리해서 표시해줘」).
// 그림은 내 PC 앨범 그림(kind "art")뿐, Stem 분리·가사 시간은 음악 작업에 둔다. 빈 묶음은 뺀다.
type KindGroup = "music" | "image";
function byKind<T extends { j: QueueJob }>(list: T[]): { key: KindGroup; list: T[] }[] {
  const groups: { key: KindGroup; list: T[] }[] = [
    { key: "music", list: list.filter((x) => x.j.kind !== "art") },
    { key: "image", list: list.filter((x) => x.j.kind === "art") },
  ];
  return groups.filter((g) => g.list.length > 0);
}

function KindHeading({ kind, count }: { kind: KindGroup; count: number }) {
  return (
    <p className={`flex items-center gap-2 pt-1 text-xs font-bold ${kind === "image" ? "text-fuchsia-200" : "text-emerald-200"}`}>
      {kind === "image" ? "🖼 그림 작업" : "🎵 음악 작업"}
      <span className="font-normal text-slate-500">{count}개</span>
      <span className={`h-px flex-1 bg-gradient-to-r ${kind === "image" ? "from-fuchsia-400/50" : "from-emerald-400/50"} to-transparent`} />
    </p>
  );
}
