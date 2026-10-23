import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-[#272732] bg-[#14141b] p-7 sm:p-8 shadow-2xl shadow-black/80 text-center backdrop-blur-md">
      <h2 className="mb-2 text-base sm:text-lg font-bold text-white">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-xs sm:text-sm text-zinc-400 leading-relaxed">
        이 프로그램은 AIMaster 통합 계정과 프로그램 권한을 공유합니다.
        <br />
        AIMaster에서 회원가입 후 로그인하시면 즉시 이용할 수 있습니다.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="inline-block w-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold py-3.5 px-4 shadow-lg shadow-orange-500/25 transition-all text-sm"
      >
        AIMaster 회원가입 바로가기 ↗
      </a>
      <p className="mt-4 text-center text-xs text-zinc-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-orange-400 hover:underline">
          로그인하기
        </Link>
      </p>
    </div>
  );
}
