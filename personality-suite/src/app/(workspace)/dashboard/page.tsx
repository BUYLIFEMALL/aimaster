import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listResults } from "@/lib/results";
import { GROUPS, testsOf, ALL_TESTS } from "@/lib/tests/registry";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const results = await listResults(user.id);
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.test_id, (counts.get(r.test_id) ?? 0) + 1);

  return (
    <div className="ps-page">
      {/* 1. 미스틱 미드나잇 퍼플 히어로 배너 */}
      <section className="ps-hero">
        <span className="ps-chip">✨ {APP_VERSION} PERSONALITY LAB</span>
        <h1>나를 깊이 이해하는 <em>AI 종합 성격 진단</em> 아틀리에</h1>
        <p>
          상황별 16유형, 대인관계 소통, 마음 상태를 다각도로 측정하고,
          여러 검사 결과를 하나의 완성된 AI 심층 입체 프로필로 융합 해석해 드립니다.
        </p>
        <div className="ps-hero-actions">
          <a href="#tests-section" className="ps-btn ps-btn-primary">🧭 검사 시작하기</a>
          <Link href="/guide" className="ps-btn ps-btn-ghost">📖 연동 &amp; 사용 매뉴얼 보기</Link>
          <div className="ps-hero-note">
            <span>🆓 가입 회원 무료 즉시 검사</span>
            <span>•</span>
            <span>🔒 회원 단독 격리 보관</span>
          </div>
        </div>
      </section>

      {/* 2. 3대 핵심 숫자 카드 */}
      <section className="ps-kpis">
        <div className="ps-kpi">
          <span className="ps-icon">📑</span>
          <div>
            <div className="ps-kpi-label">Test Suite</div>
            <div className="ps-kpi-value">{ALL_TESTS.length}종 정밀 검사</div>
            <p>상황별 16유형 · 대인소통 · 마음건강</p>
          </div>
        </div>
        <div className="ps-kpi">
          <span className="ps-icon gold">🏆</span>
          <div>
            <div className="ps-kpi-label gold">My Records</div>
            <div className="ps-kpi-value">{results.length}회 완료 기록</div>
            <p>누적 검사 결과 자동 보관 &amp; 시계열 비교</p>
          </div>
        </div>
        <div className="ps-kpi">
          <span className="ps-icon cyan">🔮</span>
          <div>
            <div className="ps-kpi-label cyan">AI Synthesis</div>
            <div className="ps-kpi-value">입체 융합 프로필</div>
            <p>Gemini 기반 다중 검사 크로스 심층 분석</p>
          </div>
        </div>
      </section>

      {/* 3. 4단계 작업 흐름 */}
      <section className="ps-panel">
        <div className="ps-between" style={{ marginBottom: 14 }}>
          <div className="ps-panel-head" style={{ marginBottom: 0 }}>
            <span className="ps-emoji">🗺️</span>
            <h2>종합 성격 진단 4단계 워크플로우</h2>
          </div>
          <Link href="/guide" className="ps-link">가이드북 바로가기 →</Link>
        </div>
        <div className="ps-steps center">
          <div className="ps-step">
            <span className="ps-step-no">STEP 01</span>
            <h3>검사 선택</h3>
            <p>궁금한 상황·주제 선택</p>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 02</span>
            <h3>직관적 응답</h3>
            <p>5단계 척도 쾌속 선택</p>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 03</span>
            <h3>즉시 결과 확인</h3>
            <p>강점·주의점·시계열 비교</p>
          </div>
          <div className="ps-step">
            <span className="ps-step-no">STEP 04</span>
            <h3>AI 융합 프로필</h3>
            <p>2종 이상 다각도 종합 해석</p>
          </div>
        </div>
      </section>

      {/* 4. 검사 그룹별 카드 */}
      <div id="tests-section">
        {GROUPS.map((g) => (
          <section key={g.id} className="test-group">
            <div className="ps-between">
              <h2 className="ps-group-title"><span className="ps-dot" />{g.label}</h2>
              <span className="ps-count">{testsOf(g.id).length}개 검사</span>
            </div>
            <p className="ps-hint">{g.hint}</p>
            <div className="project-grid">
              {testsOf(g.id).map((t) => {
                const completeCount = counts.get(t.id) ?? 0;
                return (
                  <a key={t.id} className="project-card" href={`/test/${t.id}`}>
                    <div className="ps-card-meta">
                      <span>{t.questions.length}문항 · 약 {t.minutes}분</span>
                      {completeCount > 0 && <span className="ps-done">✓ {completeCount}회 완료</span>}
                    </div>
                    <h3>{t.title}</h3>
                    <p className="ps-card-desc">{t.tagline}</p>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
