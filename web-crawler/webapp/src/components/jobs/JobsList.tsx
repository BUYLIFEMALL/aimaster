"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import type { Database, JobStatus } from "@/types/database.types";

type Job = Database["public"]["Tables"]["web_crawler_jobs"]["Row"];

const POLL_INTERVAL_MS = 5_000;
const ACTIVE_STATUSES: JobStatus[] = ["pending", "running"];

export function JobsList({ jobs }: { jobs: Job[] }) {
  const router = useRouter();
  const refreshedRef = useRef(false);

  useEffect(() => {
    const activeJobs = jobs.filter((job) => ACTIVE_STATUSES.includes(job.status));
    if (activeJobs.length === 0) return;

    refreshedRef.current = false;

    const interval = setInterval(async () => {
      if (refreshedRef.current) return;

      const results = await Promise.all(
        activeJobs.map(async (job) => {
          try {
            const res = await fetch(`/api/jobs/${job.id}/status`, { cache: "no-store" });
            if (!res.ok) return null;
            return (await res.json()) as { status: JobStatus };
          } catch {
            return null;
          }
        }),
      );

      const transitioned = results.some(
        (result) => result && !ACTIVE_STATUSES.includes(result.status),
      );

      if (transitioned && !refreshedRef.current) {
        refreshedRef.current = true;
        router.refresh();
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [jobs, router]);

  if (jobs.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm text-neutral-500">아직 생성한 작업이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <ul className="divide-y divide-neutral-100">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-900">{job.url}</p>
              <p className="mt-1 truncate text-xs text-neutral-500">
                {job.target_fields.join(", ")}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {new Date(job.created_at).toLocaleString("ko-KR")}
              </p>
              {job.status === "failed" && job.error_message && (
                <p className="mt-1 text-xs text-red-600">{job.error_message}</p>
              )}
              {job.status === "completed" && job.pii_warning && (
                <p className="mt-1 text-xs text-amber-600">
                  ⚠️ 수집된 데이터에 개인정보로 보이는 항목이 포함되어 있을 수 있습니다. 이용
                  목적과 법적 근거를 확인 후 사용해주세요.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {job.status === "completed" && (
                <span className="text-xs text-neutral-500">{job.row_count ?? 0}행</span>
              )}
              <StatusBadge status={job.status} />
              {job.status === "completed" && job.result_url && (
                <a
                  href={job.result_url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                >
                  엑셀 다운로드
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
