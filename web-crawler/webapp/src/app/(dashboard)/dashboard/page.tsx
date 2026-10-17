import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/jobs/StatusBadge";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
import { PageHero } from "@/components/ui/PageHero";
import { KpiCard } from "@/components/ui/KpiCard";
import type { JobStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const STATUS_CARDS: { status: JobStatus; icon: string; label: string; tone: "blue" | "amber" | "green" | "red" | "muted"; hint: string }[] = [
  { status: "pending", icon: "⏳", label: "대기 중", tone: "muted", hint: "곧 수집을 시작해요" },
  { status: "running", icon: "🕷️", label: "수집 중", tone: "blue", hint: "지금 페이지를 모으는 중" },
  { status: "blocked", icon: "⚠️", label: "확인 필요", tone: "amber", hint: "사이트가 막았어요 — 목록에서 선택" },
  { status: "completed", icon: "✅", label: "완료", tone: "green", hint: "엑셀을 받을 수 있어요" },
  { status: "failed", icon: "❌", label: "실패", tone: "red", hint: "오류 내용을 확인하세요" },
];

const FLOW = [
  { icon: "🔑", title: "AI 키 등록", desc: "수집 항목을 찾아 줄 AI 본인 키", href: "/settings" },
  { icon: "➕", title: "새 작업", desc: "사이트 주소 + 모을 항목 입력", href: "/jobs/new" },
  { icon: "🕷️", title: "자동 수집", desc: "사이트를 둘러보고 표로 모아요", href: "/jobs" },
  { icon: "📊", title: "엑셀 받기", desc: "완료되면 엑셀로 내려받기", href: "/jobs" },
];

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: jobs }, { data: program }] = await Promise.all([
    supabase
      .from("web_crawler_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // 대시보드 아래 프로그램 소개 — AIMaster 메인 사이트(programs.description) 문구를 그대로 가져온다.
    // 이 프로젝트의 database.types.ts에는 programs 테이블이 없어 as unknown으로 타입만 좁힌다.
    supabase.from("programs").select("description, short_desc").eq("slug", "web-crawler-saas").maybeSingle() as unknown as Promise<{
      data: { description: string | null; short_desc: string | null } | null;
    }>,
  ]);

  const counts: Record<JobStatus, number> = { pending: 0, running: 0, blocked: 0, completed: 0, failed: 0 };
  for (const job of jobs ?? []) counts[job.status] += 1;
  const recent = (jobs ?? []).slice(0, 8);
  const running = (jobs ?? []).filter((job) => job.status === "running");
  const intro = splitIntoSentenceParagraphs(program?.description || program?.short_desc || "");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHero
        badge="🏠 대시보드"
        title="사이트 주소만 넣으면, 원하는 정보를 표로 모아 드려요"
        description="주소와 모을 항목(예: 상품명·가격·링크)을 알려 주면 사이트를 둘러보며 자동으로 수집하고, 완료되면 엑셀로 받을 수 있어요."
        tip="허용된 공개 정보만 수집해 주세요. 개인정보가 섞이면 경고가 표시됩니다."
      >
        <Link href="/jobs/new" className="mx-btn-primary">
          ➕ 새 작업 만들기
        </Link>
        <Link href="/guide" className="mx-btn-ghost">
          📖 사용 매뉴얼
        </Link>
      </PageHero>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {STATUS_CARDS.map((card) => (
          <KpiCard key={card.status} icon={card.icon} label={card.label} value={counts[card.status]} hint={card.hint} tone={card.tone} />
        ))}
      </div>

      {running.length > 0 && (
        <div className="mx-card border-l-4 border-l-mx-primary">
          <h2 className="mx-section-title">
            <span className="h-2 w-2 animate-pulse rounded-full bg-mx-primary" /> 지금 수집 중인 작업 {running.length}개
          </h2>
          <ul className="space-y-1 text-sm">
            {running.slice(0, 3).map((job) => (
              <li key={job.id} className="truncate text-mx-muted">
                🕷️ <span className="text-mx-text">{job.url}</span> · 항목 {job.target_fields.length}개
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mx-card">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="mx-section-title mb-0">🕒 최근 작업</h2>
          {recent.length > 0 && (
            <Link href="/jobs" className="text-xs font-semibold text-mx-link hover:underline">
              전체 보기 →
            </Link>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-4xl">🕸️</p>
            <p className="mt-3 text-sm text-mx-muted">아직 만든 작업이 없어요. 첫 작업을 만들어 보세요.</p>
            <Link href="/jobs/new" className="mx-btn-primary mt-4">
              ➕ 첫 작업 만들기
            </Link>
          </div>
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="mx-table min-w-[640px]">
              <thead>
                <tr>
                  <th>사이트 주소</th>
                  <th className="text-right">수집 항목</th>
                  <th>상태</th>
                  <th className="text-right">모은 행</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {recent.map((job) => (
                  <tr key={job.id}>
                    <td className="max-w-[320px] truncate" title={job.url}>
                      {job.url}
                    </td>
                    <td className="text-right tabular-nums text-mx-muted">{job.target_fields.length}개</td>
                    <td>
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="text-right tabular-nums">{job.row_count ?? "-"}</td>
                    <td className="text-right">
                      {job.status === "completed" && job.result_url ? (
                        <a href={job.result_url} className="text-xs font-semibold text-mx-link hover:underline">
                          📥 엑셀
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mx-card">
        <h2 className="mx-section-title">🧭 작업 흐름</h2>
        <ol className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {FLOW.map((step, idx) => (
            <li key={step.title} className="relative">
              <Link
                href={step.href}
                className="flex h-full flex-col rounded-xl border border-mx-border bg-mx-raised p-3 transition-colors hover:border-mx-primary"
              >
                <span className="text-xs font-bold text-mx-accent">STEP {idx + 1}</span>
                <span className="mt-1 text-2xl">{step.icon}</span>
                <span className="mt-1 text-sm font-bold text-mx-text">{step.title}</span>
                <span className="text-xs text-mx-muted">{step.desc}</span>
              </Link>
              {idx < FLOW.length - 1 && (
                <span className="absolute -right-2.5 top-1/2 hidden -translate-y-1/2 text-mx-muted md:block">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {intro.length > 0 && (
        <details className="mx-card group">
          <summary className="cursor-pointer list-none text-sm font-bold text-mx-text">
            ℹ️ 프로그램 소개 <span className="text-xs font-normal text-mx-muted group-open:hidden">(펼치기)</span>
          </summary>
          <div className="mt-3 space-y-2">
            {intro.map((sentence, i) => (
              <p key={i} className="text-sm leading-relaxed text-mx-muted">
                {sentence}
              </p>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
