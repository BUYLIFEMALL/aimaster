import Link from "next/link";
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
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">🔮</div>
      <h1 className="text-3xl font-black text-neutral-900 mb-3">AIMaster 타로점</h1>
      <p className="text-neutral-500 mb-10 leading-relaxed">
        마음에 품은 질문 하나를 떠올리고 카드 3장을 뽑아보세요.
        <br />
        과거·현재·미래 흐름을 AI가 그린 카드와 함께 풀어드려요.
      </p>

      <div className="flex flex-col gap-3 items-center">
        {user ? (
          <Link
            href="/draw"
            className="w-full max-w-xs px-8 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors"
          >
            카드 뽑으러 가기
          </Link>
        ) : (
          <>
            <Link
              href="/login?redirect=/draw"
              className="w-full max-w-xs px-8 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors"
            >
              로그인하고 시작하기
            </Link>
            <p className="text-xs text-neutral-400">
              계정이 없으신가요?{" "}
              <Link href="/signup" className="underline hover:text-neutral-600">
                회원가입
              </Link>
            </p>
          </>
        )}
        <p className="text-xs text-neutral-400">3장 스프레드(과거·현재·미래) · 약 1분 소요</p>
      </div>

      {/* mbti-character와 동일한 패턴 — /settings로 보내는 링크 대신 등록 폼을 랜딩 화면에
          바로 노출해서, 로그인 직후 이 자리에서 바로 연동을 마칠 수 있게 한다. */}
      {user && (
        <div className="mt-8 w-full max-w-sm mx-auto text-left space-y-3">
          <p
            className={`text-sm font-bold mb-1 ${geminiKey && openaiKey ? "text-neutral-600" : "text-amber-700"}`}
          >
            {geminiKey && openaiKey
              ? "✅ API키등록·플랫폼연동 완료"
              : "🔑 AI 카드 일러스트·해석 생성을 위한 API키등록이 필요"}
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

      <p className="mt-4 text-xs text-neutral-400">
        AIMaster 계정 하나로 AI 타로는 물론 다른 프로그램도 함께 이용할 수 있어요.
      </p>

      <div className="mt-14 grid grid-cols-1 gap-3 text-left">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-neutral-900 mb-1">🃏 78장 정통 타로 덱</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            메이저 아르카나 22장 + 마이너 아르카나 56장, 정방향·역방향까지 반영한 3카드
            스프레드(과거-현재-미래)예요.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-neutral-900 mb-1">🎨 매번 새로 그리는 AI 카드 일러스트</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            실제 타로 카드 원화를 스캔하는 대신, 뽑힌 카드 정보만으로 Gemini(나노바나나)가
            매번 새 일러스트를 그려드려요.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-bold text-neutral-900 mb-1">✍️ 내 질문에 맞춘 AI 해석</p>
          <p className="text-xs text-neutral-500 leading-relaxed">
            떠올린 고민을 함께 입력하면 AI가 세 장의 카드를 엮어 하나의 이야기로 풀어드려요.
          </p>
        </div>
      </div>

      <p className="mt-16 text-[11px] text-neutral-300 leading-relaxed">
        이 서비스는 재미와 자기 성찰을 돕기 위한 콘텐츠이며, 의학적·법률적·재정적 조언을
        대신하지 않습니다. 카드 일러스트는 특정 상업 타로 덱의 원화를 사용하지 않고 AI가
        매번 새로 생성합니다.
      </p>
    </div>
  );
}
