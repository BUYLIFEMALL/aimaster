import { ProjectsList } from "@/components/studio/ProjectsList";

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-1 text-xl font-bold text-neutral-900">내 프로젝트</h1>
      <p className="mb-6 text-sm text-neutral-500">만든 플레이리스트는 내 계정에 저장됩니다. 눌러서 이어서 작업할 수 있습니다.</p>
      <ProjectsList />
    </div>
  );
}
