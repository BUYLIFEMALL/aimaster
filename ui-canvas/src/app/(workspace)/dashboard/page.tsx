import { ProjectList } from "@/components/workspace/ProjectList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">UI 디자인 캔버스</p>
        <h1>내 프로젝트</h1>
        <p>화면을 드래그로 설계하고, 스크린샷에서 AI가 구조를 복원해 PNG·JSON 명세로 내보냅니다. 변경 내용은 자동으로 저장됩니다.</p>
      </div>
      <ProjectList />
    </>
  );
}
