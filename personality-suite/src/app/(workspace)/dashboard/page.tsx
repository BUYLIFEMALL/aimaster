import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listResults } from "@/lib/results";
import { GROUPS, testsOf, ALL_TESTS } from "@/lib/tests/registry";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardPage() {
  const user = await requireUser();
  const results = await listResults(user.id);
  const counts = new Map<string, number>();
  for (const r of results) counts.set(r.test_id, (counts.get(r.test_id) ?? 0) + 1);

  return (
    <div className="space-y-6">
      {/* 1. 크리에이티브 아틀리에 프리미엄 히어로 배너 */}
      <section className="atelier-hero relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/85 border border-rose-200/80 shadow-sm mb-3">
          <span className="text-sm">✨</span>
          <span className="text-xs font-bold text-rose-800">
            크리에이티브 아틀리에 · 파스텔 퍼스널리티 스위트 v1.20
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight mb-2">
          나를 깊이 이해하는 <span className="text-rose-600">AI 종합 성격 진단</span> 아틀리에
        </h1>

        <p className="text-neutral-600 text-xs sm:text-sm max-w-2xl leading-relaxed mb-6">
          상황별 16유형, 대인관계 소통, 마음 상태를 다각도로 측정하고,<br className="hidden sm:inline" />
          여러 검사 결과를 하나의 완성된 AI 심층 입체 프로필로 융합 해석해 드립니다.
        </p>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#tests-section"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-bold text-xs shadow-md shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            🧭 검사 시작하기
          </a>
          <Link
            href="/guide"
            className="px-4 py-2.5 rounded-xl bg-white text-rose-700 text-xs font-bold border border-rose-200 hover:bg-rose-50 transition-all shadow-sm"
          >
            📖 연동 & 사용 매뉴얼 보기
          </Link>
          <div className="flex items-center gap-2 text-xs text-neutral-500 ml-auto">
            <span>🆓 가입 회원 무료 즉시 검사</span>
            <span>•</span>
            <span>🔒 회원 단독 격리 보관</span>
          </div>
        </div>
      </section>

      {/* 2. 3대 핵심 KPI 통계 카드 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: 지원 검사 스위트 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            📑
          </div>
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Test Suite
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              {ALL_TESTS.length}종 정밀 검사
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              상황별 16유형 · 대인소통 · 마음건강
            </p>
          </div>
        </div>

        {/* KPI 2: 나의 완료 검사 이력 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            🏆
          </div>
          <div>
            <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">
              My Records
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              {results.length}회 완료 기록
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              누적 검사 결과 자동 보관 & 시계열 비교
            </p>
          </div>
        </div>

        {/* KPI 3: AI 종합 프로필 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            🔮
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              AI Synthesis
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              입체 융합 프로필
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              Gemini 기반 다중 검사 크로스 심층 분석
            </p>
          </div>
        </div>
      </section>

      {/* 3. 4단계 인터랙티브 파이프라인 가이드 바 */}
      <section className="pipeline-bar-pastel">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <h2 className="text-sm font-extrabold text-neutral-800 tracking-tight">
              종합 성격 진단 4단계 워크플로우
            </h2>
          </div>
          <Link
            href="/guide"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
          >
            가이드북 바로가기 →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-rose-600 mb-1">STEP 01</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">검사 선택</div>
            <p className="text-[11px] text-neutral-500">궁금한 상황·주제 선택</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-violet-600 mb-1">STEP 02</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">직관적 응답</div>
            <p className="text-[11px] text-neutral-500">5단계 척도 쾌속 선택</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-amber-600 mb-1">STEP 03</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">즉시 결과 확인</div>
            <p className="text-[11px] text-neutral-500">강점·주의점·시계열 비교</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-emerald-600 mb-1">STEP 04</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">AI 융합 프로필</div>
            <p className="text-[11px] text-neutral-500">2종 이상 다각도 종합 해석</p>
          </div>
        </div>
      </section>

      {/* 4. 검사 그룹별 카드 그리드 섹션 */}
      <div id="tests-section" className="space-y-6 pt-2">
        {GROUPS.map((g) => (
          <section key={g.id} className="test-group">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-neutral-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                {g.label}
              </h2>
              <span className="text-xs text-neutral-400 font-medium">
                {testsOf(g.id).length}개 검사
              </span>
            </div>
            <p className="text-xs text-neutral-500 mb-3">{g.hint}</p>
            <div className="project-grid">
              {testsOf(g.id).map((t) => {
                const completeCount = counts.get(t.id) ?? 0;
                return (
                  <a
                    key={t.id}
                    className="project-card group relative hover:border-rose-300 transition-all"
                    href={`/test/${t.id}`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                      <span>{t.questions.length}문항 · 약 {t.minutes}분</span>
                      {completeCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[10px]">
                          ✓ {completeCount}회 완료
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-neutral-900 group-hover:text-rose-600 transition-colors">
                      {t.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                      {t.tagline}
                    </p>
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
