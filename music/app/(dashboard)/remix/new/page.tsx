import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixForm } from "@/components/remix/RemixForm";

export const dynamic = "force-dynamic";

interface RemixSource {
  title: string;
  variantId?: string;
  sourceId?: string;
}

export default async function NewRemixPage({
  searchParams,
}: {
  searchParams: { fromVariantId?: string; sourceId?: string };
}) {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  let source: RemixSource | null = null;

  if (searchParams.sourceId) {
    // 이미 만든 리믹스 원본 그룹에 새 시도를 추가하는 경우 — 재업로드/재선택 불필요.
    const { data: existingSource } = await supabase
      .from("music_remix_sources")
      .select("id, title")
      .eq("id", searchParams.sourceId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingSource) {
      source = { sourceId: existingSource.id, title: existingSource.title };
    }
  } else if (searchParams.fromVariantId) {
    const { data: variant } = await supabase
      .from("music_track_variants")
      .select("id, track_id")
      .eq("id", searchParams.fromVariantId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (variant) {
      const { data: track } = await supabase.from("music_tracks").select("title").eq("id", variant.track_id).maybeSingle();
      source = { variantId: variant.id, title: track?.title ?? "제목 없음" };
    }
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎛️</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">음악 Remix</h1>
        <p className="text-gray-500 text-base">
          원곡을 업로드하고 원하는 느낌을 설명하면 AI가 새로운 스타일로 리메이크해드려요
        </p>
      </div>
      <RemixForm source={source} />
    </div>
  );
}
