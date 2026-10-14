import { WorksList } from "@/components/studio/WorksList";
import { ServerWorks } from "@/components/studio/ServerWorks";
import { requireProgramAccess } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function WorksPage() {
  const user = await requireProgramAccess();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 작품</p>
        <h1>내 작품</h1>
        <p>완성작을 두 곳에 보관할 수 있습니다. <b>이 브라우저</b>([내 작품에 저장], 최근 20개, 서버 저장 없음)와 <b>서버 보관함</b>([서버 보관함에 저장], 선택, 다른 기기에서도 보기)입니다.</p>
      </div>
      <h2 className="cc-h">이 브라우저</h2>
      <WorksList userId={user.id} />
      <div style={{ height: 28 }} />
      <ServerWorks />
    </>
  );
}
