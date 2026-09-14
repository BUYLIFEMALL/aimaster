import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
// 한 번 가입하면 캐릭코드뿐 아니라 다른 모든 AIMaster 프로그램도 같은 계정으로 이용할 수
// 있다는 점을 여기서 안내한다(2026-09-14 사용자 결정: 회원가입 유도 채널로도 활용).
export default function SignupPage() {
  return (
    <div className="max-w-sm mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-3">🎭</div>
      <h2 className="mb-2 text-lg font-bold text-neutral-900">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-sm text-neutral-500 leading-relaxed">
        한 번 가입하면 캐릭코드는 물론, AIMaster의 다른 모든 프로그램도
        <br />
        같은 계정으로 바로 이용할 수 있어요.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="inline-block w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white hover:bg-neutral-800 transition-colors"
      >
        AIMaster 회원가입 하러가기
      </a>
      <p className="mt-4 text-center text-sm text-neutral-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
