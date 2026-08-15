import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { PlanningStatus } from "@/types/database.types";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<PlanningStatus, { label: string; className: string }> = {
  draft: { label: "초안", className: "bg-gray-100 text-gray-600" },
  planned: { label: "기획 완료", className: "bg-blue-100 text-blue-700" },
  generating: { label: "생성 중", className: "bg-amber-100 text-amber-700" },
  completed: { label: "완료", className: "bg-green-100 text-green-700" },
  error: { label: "오류", className: "bg-red-100 text-red-700" },
};

export default async function PlanningsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: plannings } = await supabase
    .from("music_plannings")
    .select("id, title, song_description, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-black text-gray-900">내 곡 기획</h1>
        <Link
          href="/plannings/new"
          className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          + 새 기획
        </Link>
      </div>

      {!plannings || plannings.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">🎵</div>
          <p>아직 기획한 곡이 없습니다. 첫 곡을 기획해보세요!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plannings.map((planning) => {
            const badge = STATUS_BADGE[planning.status];
            return (
              <Link
                key={planning.id}
                href={`/plannings/${planning.id}`}
                className="block bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{planning.title ?? "(제목 생성 전)"}</p>
                    <p className="text-sm text-gray-500 truncate">{planning.song_description}</p>
                  </div>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
