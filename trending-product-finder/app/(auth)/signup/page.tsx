import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
export default function SignupPage() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm text-center">
      <h2 className="mb-2 text-lg font-bold text-gray-800">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-sm text-gray-500">
        이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
        <br />
        AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="inline-block w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        AIMaster 회원가입 하러가기
      </a>
      <p className="mt-4 text-center text-sm text-gray-500">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-semibold text-emerald-600 hover:underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
