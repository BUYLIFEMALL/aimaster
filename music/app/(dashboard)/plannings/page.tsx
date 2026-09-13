import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { splitIntoSentenceParagraphs } from "@/lib/formatProgramDescription";
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

  const [{ data: plannings }, { data: program }] = await Promise.all([
    supabase
      .from("music_plannings")
      .select("id, title, song_description, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    // 이 프로젝트는 별도 "대시보드" 화면이 없어 이 페이지가 사실상 첫 화면이다 — 요청대로
    // 첫 화면 제목 바로 아래에 메인 페이지 프로그램 소개(programs.short_desc — 이 프로그램은
    // description이 비어있어 short_desc로 대체)를 박스로 보여준다(2026-09-13).
    // AIMaster Database 타입에는 없는 테이블이라(access.ts와 동일한 이유) 제네릭 타입 충돌을
    // 피하기 위해 from()을 느슨한 타입으로 캐스팅한다.
    (supabase as unknown as { from: (table: string) => any }) // eslint-disable-line @typescript-eslint/no-explicit-any
      .from("programs")
      .select("description, short_desc")
      .eq("slug", "music-automation")
      .maybeSingle() as Promise<{ data: { description: string | null; short_desc: string | null } | null }>,
  ]);

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

      {(program?.description || program?.short_desc) && (
        <div className="mb-6 rounded-2xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm">
          {splitIntoSentenceParagraphs(program.description || program.short_desc || "").map((sentence, i) => (
            <p key={i} className="mb-2 text-sm leading-relaxed text-gray-700 last:mb-0">
              {sentence}
            </p>
          ))}
        </div>
      )}

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
