import Link from "next/link";
import {
  Sparkles,
  Zap,
  Target,
  ShieldCheck,
  BookOpen,
  ArrowRight,
  Compass,
  CheckCircle2,
} from "lucide-react";

export default function LandingPage() {
  const PERSONALITY_GROUPS = [
    {
      group: "분석가형 (Analysts)",
      desc: "합리적이고 전략적인 혁신가",
      color: "border-violet-200 bg-violet-50/60 text-violet-800",
      badgeColor: "bg-violet-600 text-white",
      types: [
        { code: "INTJ", name: "전략가", title: "용의주도한 전략가" },
        { code: "INTP", name: "논리학자", title: "아이디어 뱅크" },
        { code: "ENTJ", name: "통솔자", title: "대담한 리더" },
        { code: "ENTP", name: "변론가", title: "뜨거운 논쟁가" },
      ],
    },
    {
      group: "외교관형 (Diplomats)",
      desc: "따뜻하고 이상주의적인 조화자",
      color: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
      badgeColor: "bg-emerald-600 text-white",
      types: [
        { code: "INFJ", name: "옹호자", title: "선의의 옹호자" },
        { code: "INFP", name: "중재자", title: "열정적인 중재자" },
        { code: "ENFJ", name: "선도자", title: "정의로운 선도자" },
        { code: "ENFP", name: "활동가", title: "재기발랄한 활동가" },
      ],
    },
    {
      group: "관리자형 (Sentinels)",
      desc: "체계적이고 신뢰할 수 있는 수호자",
      color: "border-sky-200 bg-sky-50/60 text-sky-800",
      badgeColor: "bg-sky-600 text-white",
      types: [
        { code: "ISTJ", name: "현실주의자", title: "청렴결백한 논리주의자" },
        { code: "ISFJ", name: "수호자", title: "용감한 수호자" },
        { code: "ESTJ", name: "경영자", title: "엄격한 관리자" },
        { code: "ESFJ", name: "집정관", title: "사교적인 외교관" },
      ],
    },
    {
      group: "탐험가형 (Explorers)",
      desc: "자유롭고 즉흥적인 예술가",
      color: "border-amber-200 bg-amber-50/60 text-amber-800",
      badgeColor: "bg-amber-600 text-white",
      types: [
        { code: "ISTP", name: "장인", title: "만능 재주꾼" },
        { code: "ISFP", name: "모험가", title: "호기심 많은 예술가" },
        { code: "ESTP", name: "사업가", title: "모험을 즐기는 사업가" },
        { code: "ESFP", name: "연예인", title: "자유로운 영혼의 연예인" },
      ],
    },
  ];

  return (
    <div className="space-y-8 pb-10">
      {/* 🎨 파스텔 퍼스널리티 랩 히어로 배너 */}
      <div className="studio-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100/80 border border-violet-200 text-violet-800 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              PERSONALITY CODE LAB v1.20
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-[#1c1917] tracking-tight leading-snug">
              나를 발견하는 <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-rose-500 to-amber-600">16가지 성격코드</span> 탐색실
            </h1>
            <p className="text-sm text-[#78716c] leading-relaxed">
              융(Jung) 심리유형론의 4대 이분지표(E/I, S/N, T/F, J/P)를 정밀 분석하여 나의 타고난 본성과 숨겨진 강점, 대인관계 소통 코드를 찾아보세요.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-violet-50 text-xs md:text-sm font-bold text-violet-800 border border-violet-200 shadow-sm hover:shadow transition-all group"
            >
              <BookOpen className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
              <span>16성격 가이드북</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3대 핵심 KPI 지표 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#78716c]">2분 퀵 진단</span>
            <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1c1917]">
            20<span className="text-xs font-normal text-[#a8a29e] ml-1">문항</span>
          </div>
          <p className="mt-1.5 text-xs text-[#78716c]">
            핵심 질문으로 빠르게 유형 산출
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#78716c]">16유형 정밀 매트릭스</span>
            <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-[#1c1917]">
            60<span className="text-xs font-normal text-[#a8a29e] ml-1">문항 정밀형</span>
          </div>
          <p className="mt-1.5 text-xs text-[#78716c]">
            4대 축 심층 채점으로 정확도 극대화
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#78716c]">100% 프라이버시 보장</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            안심<span className="text-xs font-normal text-[#a8a29e] ml-1">로컬 연산</span>
          </div>
          <p className="mt-1.5 text-xs text-[#78716c]">
            응답 데이터 서버 미저장 & OG 공유
          </p>
        </div>
      </div>

      {/* 검사 선택 듀얼 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 빠른 검사 */}
        <div className="rounded-2xl border-2 border-violet-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold">
              <Zap className="w-3.5 h-3.5 text-violet-600" />
              추천 · 2분 코스
            </div>
            <h2 className="text-xl font-black text-[#1c1917]">빠른 성격코드 검사</h2>
            <p className="text-xs text-[#78716c] leading-relaxed">
              바쁜 일상 속에서 가볍게 나의 성향을 확인하고 친구와 결과를 나누고 싶을 때 가장 적합합니다.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-[#78716c]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" /> 20개 핵심 문항
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-violet-600" /> 약 2분 소요
              </span>
            </div>
          </div>
          <Link
            href="/test"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-sm text-center shadow-md shadow-violet-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            <span>빠른 검사 시작하기</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 정식 검사 */}
        <div className="rounded-2xl border-2 border-amber-200 bg-white p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
              <Target className="w-3.5 h-3.5 text-amber-600" />
              정밀 심층 · 10분 코스
            </div>
            <h2 className="text-xl font-black text-[#1c1917]">정식 성격코드 검사</h2>
            <p className="text-xs text-[#78716c] leading-relaxed">
              60개 문항을 통해 4대 이분지표를 다각도에서 교차 검증하여 더욱 세밀하고 신뢰도 높은 프로필을 도출합니다.
            </p>
            <div className="pt-2 flex items-center gap-3 text-xs text-[#78716c]">
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> 60개 심층 문항
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> 약 10분 소요
              </span>
            </div>
          </div>
          <Link
            href="/test/full"
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-sm text-center shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 group"
          >
            <span>정식 검사 시작하기</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 16가지 성격 유형 4대 기질 퀵 프리뷰 갤러리 */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-violet-600" />
            <h2 className="text-base font-bold text-[#1c1917]">
              16가지 성격코드 둘러보기
            </h2>
          </div>
          <Link href="/guide" className="text-xs font-semibold text-violet-600 hover:underline">
            전체 유형 해설 보기 →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {PERSONALITY_GROUPS.map((grp) => (
            <div
              key={grp.group}
              className={`rounded-2xl border p-4 transition-all ${grp.color}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-extrabold">{grp.group}</h3>
                <span className="text-[11px] opacity-75">{grp.desc}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {grp.types.map((t) => (
                  <Link
                    key={t.code}
                    href={`/result/${t.code}`}
                    className="p-2 rounded-xl bg-white/90 hover:bg-white border border-black/5 hover:border-black/15 shadow-xs transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-black text-[#1c1917] group-hover:text-violet-600 transition-colors">
                        {t.code}
                      </div>
                      <div className="text-[10px] text-[#78716c] font-medium">
                        {t.name}
                      </div>
                    </div>
                    <span className="text-[10px] text-[#a8a29e] group-hover:translate-x-0.5 transition-transform">
                      →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
