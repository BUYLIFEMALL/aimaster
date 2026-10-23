import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Layers,
  Palette,
  FileText,
  Key
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getUserApiKey, PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LandingPage() {
  const user = await getSessionUser();
  const [geminiKey, openaiKey] = user
    ? await Promise.all([getUserApiKey(user.id, "gemini"), getUserApiKey(user.id, "openai")])
    : [null, null];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 space-y-8 text-[#f1f5f9]">
      {/* 1. 프리미엄 썸네일 히어로 배너 */}
      <div className="relative group overflow-hidden rounded-3xl border border-purple-500/35 bg-gradient-to-b from-indigo-950/80 to-[#120d24] shadow-2xl p-2.5 transition-all duration-300 hover:border-purple-500/50">
        <div className="relative w-full aspect-[21/9] sm:aspect-[16/7] overflow-hidden rounded-2xl">
          <Image
            src="/tarot-main-thumbnail.jpg"
            alt="AIMaster AI 타로점 대표 비주얼 썸네일"
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090614] via-[#090614]/40 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 text-left flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 backdrop-blur-md">
                <Sparkles className="h-3 w-3 text-purple-300" />
                78장 정통 아르카나 · 12대 화풍 연성
              </span>
              <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight drop-shadow-md">
                내면의 질문을 비추는 운명의 AI 타로 리딩
              </h2>
            </div>
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 backdrop-blur-md transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span>📖 사용 매뉴얼</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. 타이틀 & 소개 텍스트 */}
      <div className="text-center space-y-3 pt-2">
        <div className="text-5xl mb-2 animate-bounce">🔮</div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
          AIMaster 타로점 <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-300">Mystic Lab</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
          고민을 떠올리며 12종 타로 스프레드를 선택하고 카드를 골라보세요.
          <br className="hidden sm:inline" />
          Google Gemini가 나만을 위한 카드를 실시간으로 그리고, AI가 운명의 해답을 풀어드립니다.
        </p>
      </div>

      {/* 3. CTA 버튼 그룹 */}
      <div className="flex flex-col gap-3 items-center">
        {user ? (
          <Link
            href="/draw"
            className="w-full max-w-sm px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-purple-400/40"
          >
            <Sparkles className="h-5 w-5 text-amber-300" />
            <span>타로 카드 뽑으러 가기</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : (
          <>
            <Link
              href="/login?redirect=/draw"
              className="w-full max-w-sm px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-purple-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-purple-400/40"
            >
              <Key className="h-5 w-5 text-amber-300" />
              <span>로그인하고 타로 시작하기</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <p className="text-xs text-slate-400">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="underline font-semibold text-purple-300 hover:text-purple-200">
                회원가입
              </Link>
            </p>
          </>
        )}
      </div>

      {/* 4. 회원 API 키 연동 상태 카드 */}
      {user && (
        <div className="w-full max-w-md mx-auto text-left space-y-3.5 bg-[#120d24] p-5 rounded-2xl border border-[#2a1f4e] shadow-xl">
          <div className="flex items-center justify-between">
            <p
              className={`text-xs font-bold flex items-center gap-1.5 ${
                geminiKey && openaiKey ? "text-emerald-400" : "text-amber-300"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>
                {geminiKey && openaiKey
                  ? "API 키 등록 완료 (준비됨)"
                  : "AI 일러스트·해석 생성을 위한 API 키를 등록해주세요"}
              </span>
            </p>
            <Link href="/settings" className="text-[11px] text-purple-400 hover:text-purple-300 underline font-semibold">
              설정
            </Link>
          </div>
          <ApiKeyRow
            provider="gemini"
            label={PROVIDER_LABELS.gemini}
            maskedValue={geminiKey ? maskApiKey(geminiKey) : null}
          />
          <ApiKeyRow
            provider="openai"
            label={PROVIDER_LABELS.openai}
            maskedValue={openaiKey ? maskApiKey(openaiKey) : null}
          />
        </div>
      )}

      {/* 5. 3대 핵심 KPI 지표 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left pt-4">
        <div className="kpi-card rounded-2xl p-5 border border-[#2a1f4e]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400 mb-3 border border-purple-500/25">
            <Layers className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">78장 정통 아르카나 덱</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            메이저 22장 + 마이너 56장 정/역방향 반영, 원카드부터 켈틱크로스까지 12종 정통 스프레드 지원
          </p>
        </div>

        <div className="kpi-card rounded-2xl p-5 border border-[#2a1f4e]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400 mb-3 border border-pink-500/25">
            <Palette className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">매번 새로 그리는 AI 일러스트</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Google Gemini가 12대 아티스틱 화풍을 바탕으로 나만을 위한 세상에 단 하나뿐인 카드를 실시간 연성
          </p>
        </div>

        <div className="kpi-card rounded-2xl p-5 border border-[#2a1f4e]">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 mb-3 border border-amber-500/25">
            <FileText className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1.5">맞춤형 AI 종합 해석 리포트</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            질문자의 내면 고민과 뽑힌 카드 간의 유기적 상호작용을 심층 분석하여 보관함에 영구 저장
          </p>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 text-center pt-4">
        이 서비스는 자기 성찰과 심리적 영감을 돕기 위한 콘텐츠이며, 의학적·법률적·재정적 조언을 대신하지 않습니다.
      </p>
    </div>
  );
}
