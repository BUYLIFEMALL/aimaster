import { ProjectsList } from "@/components/studio/ProjectsList";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">내 프로젝트</h1>
        <p className="mt-1 text-sm text-slate-400">만든 플레이리스트는 내 계정에 저장됩니다. 눌러서 이어서 작업할 수 있습니다.</p>
      </div>
      <ProjectsList />
    </div>
  );
}
