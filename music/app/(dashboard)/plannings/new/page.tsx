import { requireProgramAccess } from "@/lib/access";
import { PlanningForm } from "@/components/plannings/PlanningForm";

export const dynamic = "force-dynamic";

export default async function NewPlanningPage() {
  await requireProgramAccess();

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">🎵</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">곡 기획</h1>
        <p className="text-gray-500 text-base">곡 설명을 입력하면 AI가 장르/제목/가사 콘셉트를 기획해드려요</p>
      </div>
      <PlanningForm />
    </div>
  );
}
