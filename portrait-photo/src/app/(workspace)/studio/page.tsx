import { Studio } from "@/components/studio/Studio";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StudioPage() {
  const user = await requireUser();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">스튜디오</p>
        <h1>AI 인물사진 스튜디오</h1>
        <p>사진 한 장으로 증명사진·프로필·SNS·화보 사진을 만들어 보세요. 촬영 목적을 먼저 고르면 어울리는 설정이 한 번에 적용됩니다.</p>
      </div>
      <Studio userId={user.id} />
    </>
  );
}
