import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import type { RemixStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";

interface SourceRow {
  id: string;
  kind: "track" | "upload";
  title: string;
  created_at: string;
}

interface RemixSummaryRow {
  id: string;
  source_id: string | null;
  status: RemixStatus;
  created_at: string;
  music_track_remix_variants: { image_url: string | null }[];
}

export default async function RemixSourcesPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: sources }, { data: remixes }] = await Promise.all([
    supabase
      .from("music_remix_sources")
      .select("id, kind, title, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("music_track_remixes")
      .select("id, source_id, status, created_at, music_track_remix_variants(image_url)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sourceList = (sources ?? []) as SourceRow[];
  const remixList = (remixes ?? []) as unknown as RemixSummaryRow[];

  // 소스별로 리믹스 개수/최신 상태/대표 이미지를 집계한다. 리믹스가 최신순으로 이미 정렬되어
  // 있으므로 각 소스에서 처음 만나는 항목이 곧 최신 리믹스다.
  const summaryBySource = new Map<
    string,
    { count: number; latestStatus: RemixStatus; thumbnail: string | null; hasGenerating: boolean }
  >();
  for (const remix of remixList) {
    if (!remix.source_id) continue;
    const existing = summaryBySource.get(remix.source_id);
    const thumbnail = remix.music_track_remix_variants.find((v) => v.image_url)?.image_url ?? null;
    if (existing) {
      existing.count += 1;
      if (remix.status === "generating") existing.hasGenerating = true;
      if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
    } else {
      summaryBySource.set(remix.source_id, {
        count: 1,
        latestStatus: remix.status,
        thumbnail,
        hasGenerating: remix.status === "generating",
      });
    }
  }

  const hasGenerating = remixList.some((r) => r.status === "generating");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <AutoRefresh enabled={hasGenerating} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">음악 Remix</h1>
        <Link
          href="/remix/new"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          + 새 리믹스
        </Link>
      </div>

      {sourceList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎛️</div>
          <p>아직 만든 리믹스가 없습니다. 원곡을 업로드해서 새 스타일로 리메이크해보세요!</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {sourceList.map((source) => {
            const summary = summaryBySource.get(source.id);
            return (
              <Link
                key={source.id}
                href={`/remix/${source.id}`}
                className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-colors flex gap-3 items-center"
              >
                {summary?.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={summary.thumbnail} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                    {source.kind === "track" ? "🎵" : "📤"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">{source.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {source.kind === "track" ? "기존 곡에서 시작" : "업로드한 원곡"} · 리믹스 {summary?.count ?? 0}개
                    {summary?.hasGenerating && " · 생성 중"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
