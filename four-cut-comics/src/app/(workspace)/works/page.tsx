import { WorksList } from "@/components/studio/WorksList";
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
        <p>[내 작품에 저장]한 완성작을 이 브라우저에 최근 20개까지 보관합니다. 서버에는 저장되지 않으므로 다른 기기·브라우저에서는 보이지 않고, 브라우저 데이터를 지우면 함께 사라집니다.</p>
      </div>
      <WorksList userId={user.id} />
    </>
  );
}
