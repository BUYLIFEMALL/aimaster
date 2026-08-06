import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import type { ShortsSourceType } from "@/types/database.types";

const SOURCE_LABELS: Record<ShortsSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: candidates } = await supabase
    .from("shorts_candidates")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const counts: Record<ShortsSourceType, number> = { http: 0, rss: 0, perplexity: 0 };
  for (const c of candidates ?? []) {
    counts[c.source_type] += 1;
  }

  const recent = (candidates ?? []).slice(0, 5);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-neutral-900">대시보드</h1>
        <Link href="/candidates">
          <Button>쇼츠 대상 수집하기</Button>
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-3">
        {(Object.keys(counts) as ShortsSourceType[]).map((type) => (
          <div key={type} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="text-2xl font-semibold text-neutral-900">{counts[type]}</div>
            <div className="mt-1 text-sm text-neutral-500">{SOURCE_LABELS[type]}로 수집</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-200 p-4">
          <h2 className="text-sm font-semibold text-neutral-900">최근 수집된 쇼츠 주제</h2>
        </div>
        {recent.length === 0 ? (
          <p className="p-4 text-sm text-neutral-500">아직 수집된 쇼츠 주제가 없습니다.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {recent.map((c) => (
              <li key={c.id} className="p-4">
                <p className="truncate text-sm font-medium text-neutral-900">{c.title}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {SOURCE_LABELS[c.source_type]} · {new Date(c.created_at).toLocaleString("ko-KR")}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
