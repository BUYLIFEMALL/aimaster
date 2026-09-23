import { createClient } from "@/lib/supabase/server";
import { requireProgramAccess } from "@/lib/access";
import { GuideModal } from "@/components/GuideModal";
import { History, Image as ImageIcon, ExternalLink, Calendar } from "lucide-react";

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
          이미지 생성 갤러리
        </h1>
        <p className="text-xs text-zinc-400">
          지금까지 생성하신 이미지 보관함입니다. 이미지를 클릭하여 보거나 언제든지 다시 다운로드하실 수 있습니다.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-500 mb-3">
            <ImageIcon className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-zinc-300">아직 생성된 이미지가 없습니다</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            [이미지 생성] 메인 작업실로 이동하여 AI 최적화 프롬프트로 첫 번째 고품질 이미지를 생성해보세요!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-700 hover:bg-zinc-900 flex flex-col"
            >
              <div className="relative aspect-square w-full overflow-hidden bg-zinc-950">
                <img
                  src={item.image_url}
                  alt={item.prompt}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex items-center gap-1.5">
                  <span className="rounded-lg bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-amber-400 border border-zinc-800">
                    {item.provider.toUpperCase()}
                  </span>
                  <span className="rounded-lg bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-[10px] font-medium text-zinc-300 border border-zinc-800">
                    {item.model}
                  </span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <p className="text-xs text-zinc-300 font-mono line-clamp-2 leading-relaxed bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50">
                  {item.prompt}
                </p>

                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50 text-[11px] text-zinc-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>{new Date(item.created_at).toLocaleDateString("ko-KR")}</span>
                  </div>
                  <a
                    href={item.image_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-amber-400 font-semibold hover:underline"
                  >
                    <span>원본 보기</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <GuideModal />
    </div>
  );
}
