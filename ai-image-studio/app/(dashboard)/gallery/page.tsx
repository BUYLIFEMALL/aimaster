import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { GuideModal } from "@/components/GuideModal";
import { GalleryClient } from "@/components/GalleryClient";
import { History } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GalleryPage() {
  const { user } = await requireProgramAccess();
  const supabase = await createClient();

  const { data: generations } = await supabase
    .from("user_image_generations")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = generations || [];

  return (
    <div className="space-y-8 pb-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <History className="h-6 w-6 text-amber-400" />
          작업 결과 갤러리 (Image Gallery)
        </h1>
        <p className="text-xs text-zinc-400">
          AI로 생성한 모든 이미지 작업 결과를 한 곳에서 확인하고 고화질 다운로드 및 프롬프트 재활용이 가능합니다.
        </p>
      </div>

      {/* Interactive Gallery Component */}
      <GalleryClient initialItems={items} />

      <GuideModal />
    </div>
  );
}
