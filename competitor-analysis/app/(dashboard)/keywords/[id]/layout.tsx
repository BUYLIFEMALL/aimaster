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
    .select("id, keyword, location")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!keyword) notFound();

  const { data: jobs } = await supabase
    .from("competitor_serp_jobs")
    .select("id, executed_at")
    .eq("user_id", user.id)
    .eq("keyword_id", keyword.id)
    .order("executed_at", { ascending: false });

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/keywords" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 키워드 목록으로
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">{keyword.keyword}</h1>
        <p className="text-xs text-gray-400 mt-1">{keyword.location}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <JobListSidebar keywordId={keyword.id} jobs={jobs ?? []} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
