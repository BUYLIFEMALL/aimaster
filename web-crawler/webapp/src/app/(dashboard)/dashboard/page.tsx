import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { StatusBadge, JOB_STATUS_LABELS } from "@/components/jobs/StatusBadge";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import type { JobStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: jobs }, { data: program }] = await Promise.all([
    supabase
      .from("web_crawler_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // 대시보드 상단 설명 박스 — AIMaster 메인 사이트(programs.description)의 프로그램 소개
    // 문구를 그대로 가져와 보여준다(2026-09-13 요청, naver-cafe-poster 패턴). 이 프로젝트의
    // database.types.ts에는 programs 테이블이 생성돼 있지 않아(공용 테이블이라 여기서는
    // 직접 안 쓰였던 탓) as unknown으로 타입만 좁혀서 캐스팅한다.
    supabase.from("programs").select("description, short_desc").eq("slug", "web-crawler-saas").maybeSingle() as unknown as Promise<{
      data: { description: string | null; short_desc: string | null } | null;
    }>,
  ]);

  const counts: Record<JobStatus, number> = {
    pending: 0,
    running: 0,
    blocked: 0,
    completed: 0,
    failed: 0,
  };
  for (const job of jobs ?? []) {
    counts[job.status] += 1;
  }

  const recent = (jobs ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">대시보드</h1>
        <Link href="/jobs/new">
          <Button>새 작업 만들기</Button>
        </Link>
      </div>

      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-neutral-700 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

      {(jobs ?? []).length === 0 && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          아직 생성한 작업이 없습니다.{" "}
          <Link href="/jobs/new" className="font-medium underline">
            첫 작업 만들러 가기
          </Link>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(counts) as JobStatus[]).map((status) => (
          <div key={status} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{counts[status]}</div>
            <div className="mt-1 text-xs text-neutral-500">{JOB_STATUS_LABELS[status]}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">최근 작업</h2>
        </div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">작업 이력이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recent.map((job) => (
              <li key={job.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <Link href="/jobs" className="block truncate text-sm text-neutral-900 hover:underline">
                    {job.url}
                  </Link>
                  <p className="mt-1 text-xs text-neutral-500">
                    {new Date(job.created_at).toLocaleString("ko-KR")}
                  </p>
                </div>
                <StatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
