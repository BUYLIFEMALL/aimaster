"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cpu, ListOrdered, Loader2, Music2 } from "lucide-react";
import { useQueue } from "@/components/engine/useQueue";
import { StageProgress } from "@/components/engine/StageProgress";
import { engineInfo } from "@/lib/engine";

/**
 * 곡 만들기 머리의 실제 상태 줄(2026-11-08 주인님 「실제 상태로 바꾸기 … 이걸 넣어」 — 동작하지 않던 24트랙 뷰파인더 목업 대신).
 * 내 PC 엔진 연결 상태 · 대기열에서 만드는 중인 곡과 진행률 · 마지막에 만든 곡.
 */
const elapsed = (from: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(from).getTime()) / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m}분 ${s % 60}초` : `${s}초`;
};
const time = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export function StudioStatusBar() {
  const { engine, supported, jobs } = useQueue(4000);
  const [now, setNow] = useState(() => Date.now());
  const running = jobs.find((j) => j.status === "running");
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const waiting = jobs.filter((j) => j.status === "queued").length;
  const lastDone = jobs
    .filter((j) => j.status === "done" && j.kind !== "stems" && j.kind !== "art" && j.kind !== "align")
    .sort((a, b) => (b.finishedAt ?? "").localeCompare(a.finishedAt ?? ""))[0];

  const s = engine.status;
  const engineLine = engine.checking
    ? { dot: "bg-slate-500", text: "내 PC 엔진 확인 중…", link: null as string | null }
    : !engine.online
      ? { dot: "bg-rose-400", text: "내 PC 엔진이 꺼져 있습니다", link: "켜기·설치" }
      : !engine.paired
        ? { dot: "bg-amber-400", text: "엔진은 켜져 있지만 이 브라우저와 연결되지 않았습니다", link: "연결하기" }
        : !engine.ready
          ? { dot: "bg-amber-400 animate-pulse", text: `준비 중 · ${s?.stage || "실행 환경 확인"}`, link: null }
          : { dot: "bg-emerald-400", text: `준비됨 · 엔진 ${s?.version ?? ""}`, link: null };

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-4 md:grid-cols-3">
      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <Cpu className="h-3.5 w-3.5" /> 내 PC 엔진
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <span className={`h-2 w-2 shrink-0 rounded-full ${engineLine.dot}`} />
          <span className="truncate">{engineLine.text}</span>
        </p>
        {engineLine.link && (
          <Link href="/engine" className="mt-1 inline-block text-[11px] font-bold text-emerald-300 hover:underline">
            {engineLine.link} →
          </Link>
        )}
      </div>

      <div className="min-w-0">
        {/* 2026-11-09 주인님 「작업 대기 메뉴 링크가 안 돼」 — 제목도 대기열 화면 링크 */}
        <Link href="/queue" className="mb-1 flex w-fit items-center gap-1.5 text-[11px] font-bold text-slate-500 hover:text-emerald-300 hover:underline">
          <ListOrdered className="h-3.5 w-3.5" /> 작업 대기열
        </Link>
        {!supported ? (
          <p className="text-sm text-slate-500">엔진을 연결하면 보입니다</p>
        ) : running ? (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-300" />
              <span className="truncate">{running.title}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {engineInfo(running.engine).name}
              {running.startedAt && ` · 지금까지 ${elapsed(running.startedAt, now)}`}
              {waiting > 0 && ` · 기다리는 곡 ${waiting}개`}
            </p>
            <StageProgress stage={running.stage} className="mt-1.5" />
          </div>
        ) : waiting > 0 ? (
          <p className="text-sm font-semibold text-slate-200">기다리는 곡 {waiting}개</p>
        ) : (
          <p className="text-sm text-slate-500">만드는 중인 곡이 없습니다</p>
        )}
        {supported && (
          <Link href="/queue" className="mt-1 inline-block text-[11px] font-bold text-emerald-300 hover:underline">
            대기열 보기 →
          </Link>
        )}
      </div>

      <div className="min-w-0">
        <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
          <Music2 className="h-3.5 w-3.5" /> 마지막에 만든 곡
        </p>
        {lastDone ? (
          <>
            <p className="truncate text-sm font-semibold text-slate-200">{lastDone.title}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {time(lastDone.finishedAt)} 완성
              {lastDone.startedAt && lastDone.finishedAt ? ` · ${elapsed(lastDone.startedAt, new Date(lastDone.finishedAt).getTime())} 걸림` : ""}
            </p>
            <Link href="/library" className="mt-1 inline-block text-[11px] font-bold text-emerald-300 hover:underline">
              모든 음악에서 듣기 →
            </Link>
          </>
        ) : (
          <p className="text-sm text-slate-500">{supported ? "아직 이 PC에서 완성한 곡이 없습니다" : "엔진을 연결하면 보입니다"}</p>
        )}
      </div>
    </div>
  );
}
