import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LandingPage() {
  const user = await getSessionUser();

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
