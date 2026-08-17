import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { RemixForm } from "@/components/remix/RemixForm";

export const dynamic = "force-dynamic";

interface RemixSource {
  variantId: string;
  title: string;
}

export default async function NewRemixPage({
  searchParams,
}: {
  searchParams: { fromVariantId?: string };
}) {
  const user = await requireProgramAccess();

  let source: RemixSource | null = null;
  const fromVariantId = searchParams.fromVariantId;
  if (fromVariantId) {
    const supabase = await createClient();
    const { data: variant } = await supabase
      .from("music_track_variants")
      .select("id, track_id")
      .eq("id", fromVariantId)
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
