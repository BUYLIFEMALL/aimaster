import { requireUser } from "@/lib/auth";
import { listResults } from "@/lib/results";
import { GROUPS, testsOf } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const results = await listResults(user.id);
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.test_id, (counts.get(r.test_id) ?? 0) + 1);

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">검사하기</p>
        <h1>나를 알아보는 성격 검사</h1>
        <p>문항에 솔직하게 답하면 결과와 해석이 바로 나옵니다. 재미와 자기 이해를 위한 참고용 검사이며 진단이 아닙니다. 2종 이상 마치면 종합 프로필도 만들 수 있어요.</p>
      </div>
      {GROUPS.map((g) => (
        <section key={g.id} className="test-group">
          <h2>{g.label}</h2>
          <p className="muted">{g.hint}</p>
          <div className="project-grid">
            {testsOf(g.id).map((t) => (
              <a key={t.id} className="project-card" href={`/test/${t.id}`}>
                <small>{t.questions.length}문항 · 약 {t.minutes}분{counts.get(t.id) ? ` · ${counts.get(t.id)}회 완료` : ""}</small>
                <h3>{t.title}</h3>
                <p className="muted">{t.tagline}</p>
              </a>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
