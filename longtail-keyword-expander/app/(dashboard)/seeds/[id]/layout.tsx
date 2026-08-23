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
    <div className="max-w-5xl mx-auto px-4 py-10">
      <Link href="/seeds" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 키워드 목록으로
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          {seed.keyword}
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
            {seed.engine === "google" ? "구글" : "네이버"}
          </span>
        </h1>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <RunListSidebar seedId={seed.id} runs={runs ?? []} />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
