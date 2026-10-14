import { ProfileView } from "@/components/tests/ProfileView";
import { requireUser } from "@/lib/auth";
import { TrendChart } from "@/components/tests/TrendChart";
import { getProfile, latestPerTest, listForTrends } from "@/lib/results";
import { isSensitive } from "@/lib/tests/registry";
import { buildTrends } from "@/lib/tests/trends";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ProfilePage() {
  const user = await requireUser();
  const [stored, latest, rows] = await Promise.all([getProfile(user.id), latestPerTest(user.id), listForTrends(user.id)]);
  const trends = buildTrends(rows, isSensitive);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">종합 프로필</p>
        <h1>여러 검사를 하나로 묶어 보기</h1>
        <p>검사마다 기준이 달라 점수를 직접 비교하지 않고, 결과들이 공통으로 가리키는 주제를 중심으로 해석합니다.</p>
      </div>
      <ProfileView initial={stored} doneCount={latest.length} />
      <section className="card trends" style={{ marginTop: 16 }}>
        <h2>시기별 변화 추이</h2>
        {trends.length === 0
          ? <p className="muted">같은 검사를 2회 이상 하면 점수 변화 그래프가 여기에 나타납니다.</p>
          : <div className="stack">{trends.map((t) => <TrendChart key={t.testId} trend={t} />)}</div>}
      </section>
    </>
  );
}
