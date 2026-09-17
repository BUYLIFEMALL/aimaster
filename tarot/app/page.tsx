import Link from "next/link";
import Image from "next/image";
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
    <div className="max-w-2xl mx-auto px-4 py-10 text-center space-y-8">
      {/* 프리미엄 썸네일 히어로 히어로 배너 */}
      <div className="relative group overflow-hidden rounded-3xl border border-purple-500/20 bg-gradient-to-b from-indigo-950/80 to-neutral-900 shadow-2xl p-2 transition-all duration-300 hover:border-purple-500/40">
        <div className="relative w-full aspect-[16/9] overflow-hidden rounded-2xl">
          <Image
            src="/tarot-main-thumbnail.png"
            alt="AIMaster AI 타로점 대표 비주얼 썸네일"
            fill
            priority
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-left space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/30 text-purple-200 border border-purple-400/30 backdrop-blur-md">
              ✨ 78장 정통 AI 타로
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight drop-shadow-md">
              나만을 위한 운명의 AI 타로 리딩
            </h2>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-5xl mb-2 animate-bounce">🔮</div>
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight">AIMaster 타로점</h1>
        <p className="text-neutral-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
          마음에 품은 고민을 떠올리고 카드 3장을 선택해보세요.
          <br />
          과거·현재·미래의 비밀을 AI가 매번 새로 그리는 카드와 함께 풀어드립니다.
        </p>
      </div>

      <div className="flex flex-col gap-3 items-center">
        {user ? (
          <Link
            href="/draw"
            className="w-full max-w-xs px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-950 via-neutral-900 to-indigo-950 text-white font-bold text-lg shadow-lg hover:shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            🃏 카드 뽑으러 가기
          </Link>
        ) : (
          <>
            <Link
              href="/login?redirect=/draw"
              className="w-full max-w-xs px-8 py-4 rounded-2xl bg-gradient-to-r from-purple-950 via-neutral-900 to-indigo-950 text-white font-bold text-lg shadow-lg hover:shadow-purple-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              🔑 로그인하고 시작하기
            </Link>
            <p className="text-xs text-neutral-400">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="underline font-semibold hover:text-neutral-700">
                회원가입
              </Link>
            </p>
          </>
        )}
        <span className="text-xs font-medium text-neutral-400">
          3장 스프레드(과거·현재·미래) · 약 1분 소요
        </span>
      </div>

      {user && (
        <div className="mt-8 w-full max-w-sm mx-auto text-left space-y-3 bg-neutral-50/80 backdrop-blur-sm p-4 rounded-2xl border border-neutral-200 shadow-sm">
          <p
            className={`text-sm font-bold mb-1 ${geminiKey && openaiKey ? "text-emerald-600" : "text-amber-700"}`}
          >
            {geminiKey && openaiKey
              ? "✅ API키 등록 · 플랫폼 연동 완료"
              : "🔑 AI 카드 일러스트 · 해석 생성을 위한 API키 등록이 필요합니다"}
          </p>
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

      {/* 다른 메인 프로그램 연동 스타일 3가지 주요 카드 */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-purple-300">
          <div className="text-2xl mb-2">🃏</div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1">78장 정통 타로 덱</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            메이저 22장 + 마이너 56장 정/역방향 반영 3카드 스프레드
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-purple-300">
          <div className="text-2xl mb-2">🎨</div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1">매번 새로 그리는 AI 일러스트</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Gemini(나노바나나)가 나만을 위해 매번 세상에 하나뿐인 일러스트 생성
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-purple-300">
          <div className="text-2xl mb-2">✍️</div>
          <h3 className="text-sm font-bold text-neutral-900 mb-1">맞춤형 AI 종합 해석</h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            떠올린 고민과 세 장의 카드를 연결한 유기적인 맞춤 리딩 제공
          </p>
        </div>
      </div>

      <p className="text-[11px] text-neutral-400 leading-relaxed pt-6">
        이 서비스는 자기 성찰을 돕기 위한 재미용 콘텐츠이며, 의학적·법률적·재정적 조언을 대신하지 않습니다.
      </p>
    </div>
  );
}

