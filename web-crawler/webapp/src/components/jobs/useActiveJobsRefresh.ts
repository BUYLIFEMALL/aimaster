"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createActiveJobsPoller, type JobStatusResult } from "@/lib/jobs/activeJobsPoller";

// 진행 중(pending·running) 작업 id 목록을 받아, 끝난 작업이 생기면 화면을 한 번 새로고침한다.
// 작업 목록(JobsList)과 대시보드(ActiveJobsRefresher)가 같이 쓴다 — 2026-11-17 T-07.
// 기존 상태 API(/api/jobs/[id]/status: 로그인+권한+본인 행만)만 쓴다. 새 API·DB 없음.

async function fetchJobStatus(id: string, signal: AbortSignal): Promise<JobStatusResult> {
  const res = await fetch(`/api/jobs/${encodeURIComponent(id)}/status`, { cache: "no-store", signal });
  if (res.status === 401 || res.status === 403 || res.status === 404) return { kind: "stop" };
  if (!res.ok) return { kind: "error" };
  const body = (await res.json()) as { status?: unknown };
  return typeof body.status === "string" ? { kind: "ok", status: body.status } : { kind: "error" };
}

export function useActiveJobsRefresh(activeJobIds: readonly string[]) {
  const router = useRouter();
  // 같은 ID 세트면 다시 만들지 않는다. 세트가 바뀌면 이전 세대를 멈추고 새로 시작한다.
  const key = activeJobIds.join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) return;
    const poller = createActiveJobsPoller({
      ids,
      fetchStatus: fetchJobStatus,
      onTransition: () => router.refresh(),
      isVisible: () => document.visibilityState !== "hidden",
    });
    poller.start();
    return () => poller.stop();
  }, [key, router]);
}
