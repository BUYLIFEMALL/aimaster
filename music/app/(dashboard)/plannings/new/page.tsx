import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PlanningForm } from "@/components/plannings/PlanningForm";

export const dynamic = "force-dynamic";

export default async function NewPlanningPage() {
  await requireProgramAccess();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/plannings"
          className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 mb-4"
        >
          <span>← 곡 목록으로 돌아가기</span>
        </Link>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎼</span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">새 음악 기획</h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          원하는 음악의 주제, 상황, 감성을 설명하면 AI가 Suno에 최적화된 스타일과 가사 콘셉트를 완성합니다.
        </p>
      </div>

      <PlanningForm />
    </div>
  );
}
