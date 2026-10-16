import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { JobListSidebar } from "@/components/keywords/JobListSidebar";

export const dynamic = "force-dynamic";

interface LayoutProps {
  params: { id: string };
  children: React.ReactNode;
}

export default async function KeywordLayout({ params, children }: LayoutProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keyword } = await supabase
    .from("competitor_keywords")
    .select("id, keyword, location, engine")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keyword) notFound();

  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, executed_at, engine")
    .eq("user_id", user.id)
    .eq("keyword_id", keyword.id)
    .order("executed_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/keywords" className="mb-4 inline-flex min-h-[40px] items-center gap-1 text-sm text-mx-muted hover:text-mx-text">
        ← 키워드 목록으로
      </Link>
      <div className="mb-6 rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">🔍 분석 키워드</span>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-mx-text">
          {keyword.keyword}
          <span className={keyword.engine === "naver" ? "mx-chip-green" : "mx-chip-blue"}>
            {keyword.engine === "naver" ? "네이버" : "구글"}
          </span>
        </h1>
        <p className="mt-1 text-sm text-mx-muted">
          {keyword.location} · 분석 이력 {(jobs ?? []).length}회
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <JobListSidebar keywordId={keyword.id} jobs={jobs ?? []} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
