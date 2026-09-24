import { createAdminClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { GuideModal } from "@/components/GuideModal";
import { GalleryClient } from "@/components/GalleryClient";
import { PageHeaderLogo } from "@/components/PageHeaderLogo";
import { History, Clock } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_IMAGE_STUDIO_PROGRAM_ID = "26b9f0b2-b48b-4f9d-b751-ecb88e98e95e";

export default async function GalleryPage() {
  const { user } = await requireProgramAccess();
  const supabaseAdmin = createAdminClient();

  // Auto cleanup image generations older than 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("usage_logs")
    .delete()
    .eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID)
    .lt("created_at", thirtyDaysAgo);

  const { data: logs } = await supabaseAdmin
    .from("usage_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("program_id", AI_IMAGE_STUDIO_PROGRAM_ID)
    .order("created_at", { ascending: false });

  const items = (logs || [])
    .map((log) => ({
      id: log.id,
      provider: log.metadata?.provider || "replicate",
      model: log.metadata?.model || "flux-2-dev",
      prompt: log.metadata?.prompt || "",
      enhanced_prompt: log.metadata?.enhanced_prompt || "",
      image_url: log.metadata?.image_url || "",
      created_at: log.created_at
    }))
    .filter((item) => Boolean(item.image_url));

  return (
    <div className="space-y-8 pb-12">
      {/* Title Hero with Top-Right Logo */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <History className="h-6 w-6 text-amber-400" />
            작업 결과 갤러리 (Image Gallery)
          </h1>
          <p className="text-sm text-zinc-300">
            AI로 생성한 모든 이미지 작업 결과를 한 곳에서 확인하고 고화질 다운로드 및 프롬프트 재활용이 가능합니다.
          </p>
        </div>

        {/* Top-Right Logo Component */}
        <PageHeaderLogo />
      </div>

      {/* 30-Day Retention & Download Notice Banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4.5 text-amber-200 shadow-md backdrop-blur-sm">
        <Clock className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
        <div className="flex-1 text-xs sm:text-sm leading-relaxed space-y-1">
          <h2 className="text-amber-300 font-bold text-sm sm:text-base">[이미지 자동 보관 및 다운로드 안내]</h2>
          <p className="text-zinc-200">
            생성된 이미지는 갤러리에 <span className="text-white font-bold underline decoration-amber-400">최장 30일간 보관</span>되며, 30일이 지난 이미지는 DB와 서버에서 자동으로 정리됩니다.
          </p>
          <p className="text-amber-200 font-medium">
            소장하고 싶은 이미지 결과물은 각 카드의 <span className="text-emerald-400 font-bold">📥 [다운로드]</span> 버튼을 클릭하여 다운로드 하시기 바랍니다.
          </p>
        </div>
      </div>

      {/* Interactive Gallery Component */}
      <GalleryClient initialItems={items} />

      <GuideModal />
    </div>
  );
}
