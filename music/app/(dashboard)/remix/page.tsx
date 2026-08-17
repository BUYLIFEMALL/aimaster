import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixCard, type RemixCardData } from "@/components/remix/RemixCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";

export const dynamic = "force-dynamic";

export default async function RemixPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: remixes } = await supabase
    .from("music_track_remixes")
    .select("*, music_track_remix_variants(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const remixList = (remixes ?? []) as unknown as RemixCardData[];
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

      {remixList.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎛️</div>
          <p>아직 만든 리믹스가 없습니다. 원곡을 업로드해서 새 스타일로 리메이크해보세요!</p>
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
