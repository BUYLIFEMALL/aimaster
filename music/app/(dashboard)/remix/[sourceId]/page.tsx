import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixCard, type RemixCardData } from "@/components/remix/RemixCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { sourceId: string };
}

export default async function RemixSourceDetailPage({ params }: PageProps) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: source } = await supabase
    .from("music_remix_sources")
    .select("id, kind, title, created_at")
    .eq("id", params.sourceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!source) notFound();

  const { data: remixes } = await supabase
    .from("music_track_remixes")
    .select("*, music_track_remix_variants(*)")
    .eq("user_id", user.id)
    .eq("source_id", source.id)
    .order("created_at", { ascending: false });

  const remixList = (remixes ?? []) as unknown as RemixCardData[];
  const hasGenerating = remixList.some((r) => r.status === "generating");

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <AutoRefresh enabled={hasGenerating} />

      <Link href="/remix" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 리믹스 원본 목록으로
      </Link>

      <div className="flex items-center justify-between mb-6 gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-400 mb-1">
            {source.kind === "track" ? "🎵 기존 곡에서 시작" : "📤 업로드한 원곡"}
          </p>
          <h1 className="text-2xl font-black text-gray-900 truncate">{source.title}</h1>
        </div>
        <Link
          href={`/remix/new?sourceId=${source.id}`}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          + 이 원본으로 리믹스 추가
        </Link>
      </div>

      {remixList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎛️</div>
          <p>이 원본으로 만든 리믹스가 아직 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {remixList.map((remix) => (
            <RemixCard key={remix.id} remix={remix} />
          ))}
        </div>
      )}
    </div>
  );
}
