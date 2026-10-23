import { ProjectList } from "@/components/workspace/ProjectList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">유튜브 썸네일</p>
        <h1>내 프로젝트</h1>
        <p>영상 주제와 타겟을 고르면 AI가 A/B 전략과 썸네일 2종을 만들어 줍니다. 변경 내용과 생성한 이미지는 자동으로 저장됩니다.</p>
      </div>
      <ProjectList />
    </>
  );
}
