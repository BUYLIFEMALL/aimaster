import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getUserApiKey, PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { StylePreferencePicker } from "@/components/StylePreferencePicker";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LandingPage() {
  const user = await getSessionUser();
  const geminiKey = user ? await getUserApiKey(user.id, "gemini") : null;

  return (
    <div className="w-full space-y-8 pb-12">
      {/* 1. 크리에이티브 아틀리에 프리미엄 히어로 섹션 */}
      <section className="atelier-hero p-6 sm:p-10 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-rose-200/80 shadow-sm mb-4">
          <span className="text-sm">✨</span>
          <span className="text-xs font-bold text-rose-800">
            크리에이티브 아틀리에 · 파스텔 크림 에디션 v1.20
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-black text-neutral-900 tracking-tight mb-4">
          나와 꼭 닮은 <span className="text-rose-600">오리지널 캐릭터</span>를 만나요
        </h1>

        <p className="text-neutral-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed mb-8">
          20개 질문으로 분석하는 나의 4차원 심리유형과<br className="hidden sm:inline" />
          독립된 세계관을 가진 16명의 자체 제작 캐릭터 매칭 & AI 맞춤 화풍 일러스트 아틀리에
        </p>

        {/* 메인 액션 버튼 */}
        <div className="flex flex-col items-center gap-3">
          {user ? (
            <Link
              href="/test"
              className="w-full max-w-xs px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-indigo-600 text-white font-extrabold text-lg shadow-lg shadow-rose-500/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              🎭 내 캐릭터 찾기 시작
            </Link>
          ) : (
            <>
              <Link
                href="/login?redirect=/test"
                className="w-full max-w-xs px-8 py-4 rounded-2xl bg-neutral-900 text-white font-extrabold text-lg shadow-lg hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                로그인하고 시작하기
              </Link>
              <p className="text-xs text-neutral-400">
                계정이 없으신가요?{" "}
                <Link href="/signup" className="underline font-medium text-rose-600 hover:text-rose-700">
                  무료 회원가입
                </Link>
              </p>
            </>
          )}
          <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
            <span>⏱️ 20문항 약 2분 소요</span>
            <span>•</span>
            <span>🆓 가입 회원 무료 이용</span>
          </div>
        </div>
      </section>

      {/* 2. 3대 핵심 KPI 통계 카드 */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* KPI 1: 16대 오리지널 캐릭터 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            👥
          </div>
          <div>
            <div className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
              Character Pool
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              16대 오리지널
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              자체 창작 독립 캐릭터 매칭 (저작권 안심 보장)
            </p>
          </div>
        </div>

        {/* KPI 2: 20문항 4차원 지표 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 border border-violet-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            🧭
          </div>
          <div>
            <div className="text-[11px] font-bold text-violet-600 uppercase tracking-wider">
              Analysis Metric
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              4차원 심리 지표
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              E/I · S/N · T/F · J/P 4개 이분지표 정밀 균형 분석
            </p>
          </div>
        </div>

        {/* KPI 3: AI 화풍 일러스트 */}
        <div className="stat-card-pastel flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl flex-shrink-0 shadow-sm">
            🎨
          </div>
          <div>
            <div className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
              AI Illustration
            </div>
            <div className="text-2xl font-black text-neutral-900 mt-0.5">
              맞춤 화풍 생성
            </div>
            <p className="text-xs text-neutral-500 mt-1 leading-snug">
              Gemini 2.5 Flash 기반 고해상도 나만의 아트워크
            </p>
          </div>
        </div>
      </section>

      {/* 3. 4단계 인터랙티브 파이프라인 가이드 바 */}
      <section className="pipeline-bar-pastel p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗺️</span>
            <h2 className="text-sm font-extrabold text-neutral-800 tracking-tight">
              캐릭코드 4단계 분석 & 생성 파이프라인
            </h2>
          </div>
          <Link
            href="/guide"
            className="text-xs font-bold text-rose-600 hover:text-rose-700 underline"
          >
            상세 매뉴얼 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-rose-600 mb-1">STEP 01</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">20문항 검사</div>
            <p className="text-[11px] text-neutral-500">2분 직관적 질문 응답</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-violet-600 mb-1">STEP 02</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">4대 지표 산출</div>
            <p className="text-[11px] text-neutral-500">E/I·S/N·T/F·J/P 점수화</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-amber-600 mb-1">STEP 03</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">캐릭터 매칭</div>
            <p className="text-[11px] text-neutral-500">16대 독립 페르소나</p>
          </div>
          <div className="p-3 rounded-xl bg-[#faf7f2] border border-[#f1ebe1] text-center">
            <div className="text-xs font-bold text-emerald-600 mb-1">STEP 04</div>
            <div className="text-sm font-bold text-neutral-900 mb-0.5">AI 생성 & 공유</div>
            <p className="text-[11px] text-neutral-500">화풍 일러스트 & SNS 카드</p>
          </div>
        </div>
      </section>

      {/* 4. API키 연동 & 맞춤 화풍 선호도 설정 (로그인 사용자 전용) */}
      {user && (
        <section className="bg-white rounded-2xl border border-[#f1ebe1] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔑</span>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">
                  AI 캐릭터 일러스트 연동 설정
                </h3>
                <p className="text-xs text-neutral-500">
                  본인의 Gemini API 키를 등록하면 결과 화면에서 고유 화풍 일러스트를 무제한 생성할 수 있습니다.
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                geminiKey
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {geminiKey ? "연동 완료" : "연동 필요"}
            </span>
          </div>

          <div className="max-w-md">
            <ApiKeyRow
              provider="gemini"
              label={PROVIDER_LABELS.gemini}
              maskedValue={geminiKey ? maskApiKey(geminiKey) : null}
            />
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <div className="text-xs font-bold text-neutral-700 mb-2">
                🎨 선호하는 AI 캐릭터 일러스트 화풍 선택
              </div>
              <StylePreferencePicker />
            </div>
          </div>
        </section>
      )}

      {/* 5. 가이드북 바로가기 배너 */}
      <section className="rounded-2xl p-6 bg-gradient-to-r from-rose-50 via-purple-50 to-indigo-50 border border-rose-100 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">📖</div>
          <div>
            <h3 className="text-sm font-extrabold text-neutral-900">
              캐릭코드 공식 가이드 & 16대 캐릭터 도감
            </h3>
            <p className="text-xs text-neutral-600 mt-0.5">
              16대 캐릭터의 세계관, 시그니처 대사, 7대 황금 수칙과 자주 묻는 질문을 확인하세요.
            </p>
          </div>
        </div>
        <Link
          href="/guide"
          className="px-4 py-2 rounded-xl bg-white text-rose-700 text-xs font-bold border border-rose-200 shadow-sm hover:bg-rose-50 transition-all flex-shrink-0"
        >
          가이드북 열기 →
        </Link>
      </section>

      {/* 안내 고지 */}
      <div className="text-center text-[11px] text-neutral-400 max-w-lg mx-auto leading-relaxed pt-4">
        이 검사는 융(Carl Jung) 심리유형론의 4개 이분지표를 참고해 자체 개발한 성격유형 분석 서비스이며,
        등장하는 16명의 캐릭터는 본 서비스를 위해 순수 창작된 오리지널 저작물입니다. 공식 MBTI®와는 무관한 재미용 콘텐츠입니다.
      </div>
    </div>
  );
}
