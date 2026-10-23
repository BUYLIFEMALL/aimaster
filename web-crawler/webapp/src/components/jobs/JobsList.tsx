"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { resumeJobAction, cancelJobAction } from "@/lib/actions/jobs";
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
      <div className="rounded-lg border border-mx-border bg-mx-surface p-6 text-center">
        <p className="text-sm text-mx-muted">아직 생성한 작업이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-mx-border bg-mx-surface">
      <ul className="divide-y divide-mx-border">
        {jobs.map((job) => (
          <li key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-mx-text">{job.url}</p>
              <p className="mt-1 truncate text-xs text-mx-muted">
                {job.target_fields.join(", ")}
              </p>
              <p className="mt-1 text-xs text-mx-muted">
                {new Date(job.created_at).toLocaleString("ko-KR")}
              </p>
              {job.status === "failed" && job.error_message && (
                <p className="mt-1 text-xs text-mx-danger">{job.error_message}</p>
              )}
              {job.status === "blocked" && job.error_message && (
                <div className="mt-2 rounded-lg border border-mx-accent/40 bg-mx-accent/15 p-2.5 text-xs text-mx-accent">
                  <p>{job.error_message}</p>
                  <p className="mt-1 text-mx-accent">
                    우회를 시도하면 더 강한 방식으로 다시 접속해봅니다. 성공을 보장하지는
                    않으며, 사이트 보호가 강할 경우에도 결국 실패할 수 있습니다.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <form action={resumeJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-md bg-mx-accent px-2.5 py-1 text-xs font-bold text-black hover:bg-mx-accent/85"
                      >
                        우회해서 계속 진행
                      </button>
                    </form>
                    <form action={cancelJobAction}>
                      <input type="hidden" name="jobId" value={job.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-mx-accent/40 bg-mx-surface px-2.5 py-1 text-xs font-medium text-mx-accent hover:bg-mx-accent/25"
                      >
                        중단하기
                      </button>
                    </form>
                  </div>
                </div>
              )}
              {job.status === "completed" && job.pii_warning && (
                <p className="mt-1 text-xs text-mx-accent">
                  ⚠️ 수집된 데이터에 개인정보로 보이는 항목이 포함되어 있을 수 있습니다. 이용
                  목적과 법적 근거를 확인 후 사용해주세요.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {job.status === "completed" && (
                <span className="text-xs text-mx-muted">{job.row_count ?? 0}행</span>
              )}
              <StatusBadge status={job.status} />
              {job.status === "completed" && job.result_url && (
                <a
                  href={`/api/jobs/${job.id}/download`} // v1.10: 비공개 버킷 — 본인 확인 뒤 10분짜리 임시 주소
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-mx-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-mx-raised"
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
