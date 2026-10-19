import Link from "next/link";
import ProductForm from "@/components/ProductForm";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const registeredProviders = await getRegisteredProviders(supabase, user.id);

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* ── 1. 셀러 스튜디오 프리미엄 히어로 배너 ── */}
      <section className="studio-hero p-6 sm:p-8 relative">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold border border-white/20">
            <span>🛍️ 이커머스 셀러 스튜디오</span>
            <span className="w-1 h-1 rounded-full bg-amber-400" />
            <span className="text-amber-300">{APP_VERSION}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
            AI 상세페이지 자동생성기
          </h1>

          <p className="text-sm sm:text-base text-blue-100 font-medium leading-relaxed">
            제품 사진과 기본 스펙만 입력하면, AI가 쿠팡 · 스마트스토어 · 프리미엄 몰에 최적화된
            <br className="hidden sm:inline" />
            고전환율 카피라이팅과 설득형 상세페이지를 원클릭으로 완성해 드립니다.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/guide"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-900 text-xs sm:text-sm font-bold shadow-md hover:bg-blue-50 transition-all hover:scale-105 active:scale-95"
            >
              <span>📖 연동 & 사용 매뉴얼 보기</span>
              <span>→</span>
            </Link>
            <Link
              href="/settings"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs sm:text-sm font-bold backdrop-blur-md border border-white/20 transition-all"
            >
              <span>🔑 API 키 설정</span>
            </Link>
          </div>
        </div>

        {/* 장식용 배경 그래픽 */}
        <div className="absolute right-4 -bottom-6 text-8xl sm:text-9xl opacity-15 select-none pointer-events-none hidden md:block">
          🛒
        </div>
      </section>

      {/* ── 2. 3대 핵심 KPI 통계 카드 ── */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0">
              ⏱️
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">기획 완성 시간</p>
              <p className="text-lg font-black text-slate-900">평균 30초 내외</p>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">수작업 기획 대비 95% 단축</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
              🎯
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">플랫폼 최적화</p>
              <p className="text-lg font-black text-slate-900">3대 템플릿 지원</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">쿠팡 / 스마트스토어 / 럭셔리</p>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0">
              📈
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500">전환율 설득 파이프라인</p>
              <p className="text-lg font-black text-slate-900">7단계 고전환 구조</p>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">문제제기·신뢰수치·구매보장</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. 4단계 제작 파이프라인 가이드 바 ── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>🚀</span>
            <span>원클릭 상세페이지 제작 단계</span>
          </h2>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            차례대로 입력하면 AI가 최적의 레이아웃을 생성합니다
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white mb-1">
              STEP 1
            </span>
            <p className="text-xs font-bold text-slate-900">템플릿 선택</p>
            <p className="text-[11px] text-slate-500 mt-0.5">쿠팡/네이버/럭셔리 타깃</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white mb-1">
              STEP 2
            </span>
            <p className="text-xs font-bold text-slate-900">제품 스펙 & 이미지</p>
            <p className="text-[11px] text-slate-500 mt-0.5">업로드 또는 AI 이미지 생성</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white mb-1">
              STEP 3
            </span>
            <p className="text-xs font-bold text-slate-900">신뢰 & 보장 데이터</p>
            <p className="text-[11px] text-slate-500 mt-0.5">판매량/리뷰/배송/환불 안내</p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-left">
            <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-600 text-white mb-1">
              STEP 4
            </span>
            <p className="text-xs font-bold text-slate-900">AI 카피 & 프리뷰</p>
            <p className="text-[11px] text-slate-500 mt-0.5">고해상도 이미지/HTML 출력</p>
          </div>
        </div>
      </section>

      {/* ── 4. 핵심 폼 영역 ── */}
      <section className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-8 shadow-sm">
        <ProductForm registeredProviders={Array.from(registeredProviders)} />
      </section>
    </main>
  );
}
