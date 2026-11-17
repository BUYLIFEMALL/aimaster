"use client";

import { useActiveJobsRefresh } from "@/components/jobs/useActiveJobsRefresh";

/** 화면에 아무것도 그리지 않는다. 서버 화면(대시보드)이 진행 중 작업 id만 넘긴다 — 2026-11-17 T-07. */
export function ActiveJobsRefresher({ ids }: { ids: string[] }) {
  useActiveJobsRefresh(ids);
  return null;
}
