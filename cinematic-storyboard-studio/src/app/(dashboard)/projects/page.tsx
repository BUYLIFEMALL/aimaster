import { ProjectsList } from "@/components/studio/ProjectsList";
import { Film } from "lucide-react";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-100">
          <Film size={22} className="text-amber-500" />
          내 프로젝트 아카이브
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          제작된 스토리보드와 콘택트 시트가 계정에 안전하게 보관됩니다. 카드를 클릭하여 이어서 작업하거나 영상 프롬프트를 다시 추출할 수 있습니다.
        </p>
      </div>
      <ProjectsList />
    </div>
  );
}
