import Link from "next/link";
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
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/remix"
          className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1 mb-4"
        >
          <span>← 리믹스 목록으로 돌아가기</span>
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎛️</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">새 리믹스 생성</h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          원곡을 기반으로 원하는 분위기, 장르, 보컬 스타일을 입력해 Suno AI 엔진으로 새롭게 재해석합니다.
        </p>
      </div>

      <RemixForm source={source} />
    </div>
  );
}
