import { ProfileView } from "@/components/tests/ProfileView";
import { requireUser } from "@/lib/auth";
import { getProfile, latestPerTest } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProfilePage() {
  const user = await requireUser();
  const [stored, latest] = await Promise.all([getProfile(user.id), latestPerTest(user.id)]);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">종합 프로필</p>
        <h1>여러 검사를 하나로 묶어 보기</h1>
        <p>검사마다 기준이 달라 점수를 직접 비교하지 않고, 결과들이 공통으로 가리키는 주제를 중심으로 해석합니다.</p>
      </div>
      <ProfileView initial={stored} doneCount={latest.length} />
    </>
  );
}
