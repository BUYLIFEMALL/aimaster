import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 회원가입은 AIMaster에서만 받는다 — 모든 AI 프로그램은 AIMaster 계정/구독 권한을 공유한다.
export default function SignupPage() {
  return (
    <div className="glass-card p-6 text-center">
      <h2 className="mb-2 text-lg font-medium text-neutral-100">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-sm text-neutral-400">
        이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
        <br />
        AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="inline-block w-full rounded-lg bg-gold-gradient px-4 py-2 text-sm font-medium text-dark"
      >
        AIMaster 회원가입 하러가기
      </a>
      <p className="mt-4 text-center text-sm text-neutral-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-medium text-gold underline">
          로그인
        </Link>
      </p>
    </div>
  );
}
