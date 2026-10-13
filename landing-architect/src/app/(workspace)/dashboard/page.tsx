import { ProjectList } from "@/components/workspace/ProjectList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">랜딩페이지 기획</p>
        <h1>내 프로젝트</h1>
        <p>주제·타겟·목표를 입력하면 AI가 기획안과 HTML 프로토타입을 만들어 줍니다. 변경 내용은 자동으로 저장됩니다.</p>
      </div>
      <ProjectList />
    </>
  );
}
