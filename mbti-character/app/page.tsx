import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getUserApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LandingPage() {
  const user = await getSessionUser();
  const geminiKey = user ? await getUserApiKey(user.id, "gemini") : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-6xl mb-6">🎭</div>
      <h1 className="text-3xl font-black text-neutral-900 mb-3">캐릭코드(MBTI)</h1>
      <p className="text-neutral-500 mb-10 leading-relaxed">
        20개 질문에 답하면 나의 성격유형과
        <br />꼭 닮은 오리지널 캐릭터를 찾아드려요.
      </p>

      <div className="flex flex-col gap-3 items-center">
        {user ? (
          <Link
            href="/test"
            className="w-full max-w-xs px-8 py-4 rounded-2xl bg-neutral-900 text-white font-bold text-lg hover:bg-neutral-800 transition-colors"
          >
            내 캐릭터 찾기
          </Link>
        ) : (
          <>
            <Link
              href="/login?redirect=/test"
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
        <p className="text-xs text-neutral-400">20문항 · 약 2분 소요</p>
      </div>

      {/* API키등록·플랫폼연동 — 눈에 잘 띄도록 CTA 바로 아래, 계정 안내 문구 위에 배치.
          로그인했지만 Gemini 키를 아직 연동하지 않은 경우 강조 스타일로 바로 연동을
          진행할 수 있게 안내한다(2026-09-14 사용자 요청). */}
      {user && (
        <div className="mt-8 w-full max-w-xs mx-auto">
          {geminiKey ? (
            <Link
              href="/settings"
              className="flex items-center justify-between px-4 py-3 rounded-2xl border border-neutral-200 bg-white text-sm hover:border-neutral-400 transition-colors"
            >
              <span className="text-neutral-600">✅ API키등록·플랫폼연동</span>
              <span className="text-neutral-400 text-xs">관리 →</span>
            </Link>
          ) : (
            <Link
              href="/settings"
              className="flex flex-col gap-1 px-4 py-3 rounded-2xl border-2 border-amber-400 bg-amber-50 hover:bg-amber-100 transition-colors"
            >
              <span className="text-sm font-bold text-amber-800">🔑 API키등록·플랫폼연동이 필요해요</span>
              <span className="text-xs text-amber-700">
                AI 캐릭터 이미지를 생성하려면 Gemini 연동이 필요합니다 — 지금 연동하기 →
              </span>
            </Link>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-400">
        AIMaster 계정 하나로 캐릭코드는 물론 다른 프로그램도 함께 이용할 수 있어요.
      </p>

      <p className="mt-16 text-[11px] text-neutral-300 leading-relaxed">
        이 검사는 융(Jung) 심리유형론에서 널리 쓰이는 4개 이분지표 개념을 참고해 자체
        제작한 성격유형 테스트이며, 등장하는 16명의 캐릭터도 전부 이 서비스를 위해 새로
        창작한 오리지널 캐릭터입니다. 공식 MBTI® 검사와는 무관한 재미용 콘텐츠입니다.
      </p>
    </div>
  );
}
