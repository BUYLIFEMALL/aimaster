import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RunListSidebar } from "@/components/seeds/RunListSidebar";

export const dynamic = "force-dynamic";

interface LayoutProps {
  params: { id: string };
  children: React.ReactNode;
}

export default async function SeedLayout({ params, children }: LayoutProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: seed } = await supabase
    .from("longtail_seed_keywords")
    .select("id, keyword, engine")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!seed) notFound();

  const { data: runs } = await supabase
    .from("longtail_runs")
    .select("id, executed_at, related_count, expansion_count")
    .eq("user_id", user.id)
    .eq("seed_id", seed.id)
    .order("executed_at", { ascending: false });

  return (
    <div className="mx-auto max-w-6xl">
      <Link href="/seeds" className="mb-4 inline-flex min-h-[40px] items-center gap-1 text-sm text-mx-muted hover:text-mx-text">
        ← 키워드 목록으로
      </Link>
      <div className="mb-6 rounded-2xl border border-mx-border bg-gradient-to-br from-[#172554] via-mx-surface to-mx-surface p-5">
        <span className="mx-chip-blue mb-2">🌱 씨드 키워드</span>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-black text-mx-text">
          {seed.keyword}
          <span className={seed.engine === "google" ? "mx-chip-blue" : "mx-chip-green"}>
            {seed.engine === "google" ? "구글" : "네이버"}
          </span>
        </h1>
        <p className="mt-1 text-sm text-mx-muted">실행 이력 {(runs ?? []).length}회 · 연관·롱테일 키워드는 실행할 때마다 이 키워드에 누적됩니다.</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <RunListSidebar seedId={seed.id} runs={runs ?? []} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
