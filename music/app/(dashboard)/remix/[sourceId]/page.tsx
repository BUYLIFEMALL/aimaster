import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixCard, type RemixCardData } from "@/components/remix/RemixCard";
import { AutoRefresh } from "@/components/plannings/AutoRefresh";
import { withSignedStorageUrls } from "@/lib/storageSign";
import { SongListExport } from "@/components/SongListExport";

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
    .or(`source_id.eq.${source.id},second_source_id.eq.${source.id}`) // 매시업의 두 번째 곡으로 쓰인 것도
    .order("created_at", { ascending: false });

  // 비공개 저장소: 리믹스 음원·커버를 서명 주소로(lib/storageSign.ts).
  const remixList = await withSignedStorageUrls((remixes ?? []) as unknown as RemixCardData[]);
  const hasGenerating = remixList.some((r) => r.status === "generating");

  // v1.42(D-68-03): 완성 리믹스의 최신 결과(카드에 보이는 묶음, 오래된 순)를 목차·CSV로 내보낸다
  const MODE_NAME: Record<string, string> = { cover: "리믹스", add_vocals: "보컬 추가", add_instrumental: "반주 추가", mashup: "매시업" };
  const exportSongs = [...remixList]
    .filter((r) => r.status === "completed" && r.music_track_remix_variants.length > 0)
    .reverse()
    .flatMap((r) => {
      const latest = Math.max(...r.music_track_remix_variants.map((v) => new Date(v.created_at).getTime()));
      const batch = r.music_track_remix_variants.filter((v) => latest - new Date(v.created_at).getTime() < 2000);
      const row = r as RemixCardData & { instrumental?: boolean };
      return batch.map((v, i) => ({
        planningTitle: source.title,
        title: `${source.title} ${MODE_NAME[r.mode ?? "cover"] ?? "리믹스"} #${i + 1}`,
        mode: row.instrumental ? "instrumental" : "vocal",
        durationSeconds: v.duration_seconds,
        style: r.style_description,
      }));
    });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-10">
      <AutoRefresh enabled={hasGenerating} />

      <Link
        href="/remix"
        className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 mb-6"
      >
        <span>← 리믹스 목록으로 돌아가기</span>
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 rounded-2xl border border-[#272732] bg-[#14141b] p-6 shadow-xl shadow-black/30">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
              {source.kind === "track" ? "🎵 기존 트랙 기반" : source.kind === "mr" ? "🎚️ MR 분리 음원" : "📤 업로드 원곡"}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white truncate">{source.title}</h1>
          {exportSongs.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SongListExport
                songs={exportSongs}
                fileLabel={`${source.title} 리믹스`}
                className="border-[#2d2d3e] text-zinc-300 hover:border-orange-500/40 hover:text-orange-300"
              />
            </div>
          )}
        </div>

        <Link
          href={`/remix/new?sourceId=${source.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span>+ 이 원본으로 새 리믹스 추가</span>
        </Link>
      </div>

      {remixList.length === 0 ? (
        <div className="rounded-2xl border border-[#272732] bg-[#14141b]/80 p-12 text-center text-zinc-400">
          <div className="text-4xl mb-3">🎛️</div>
          <p className="text-sm font-bold text-zinc-200 mb-1">이 원본으로 만든 리믹스가 아직 없습니다.</p>
          <p className="text-xs text-zinc-400 mb-4">새로운 무드와 스타일을 적용해 첫 리믹스를 시작해보세요.</p>
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
