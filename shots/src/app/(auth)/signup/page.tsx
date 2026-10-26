import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 회원가입은 AIMaster에서만 받는다 (헐리우드 시네마틱 네온 REC 테마 일치화)
export default function SignupPage() {
  return (
    <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-7 md:p-8 text-center shadow-2xl">
      <h2 className="mb-2 text-base font-black text-white">회원가입은 AIMaster에서 진행됩니다</h2>
      <p className="mb-6 text-xs text-slate-300 leading-relaxed">
        이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
        <br />
        AIMaster에서 회원가입 후 이 프로그램을 구독하면 이용할 수 있습니다.
      </p>
      <a
        href={`${MAIN_SITE_URL}/register`}
        className="btn-3d-amber block w-full py-3 text-xs font-black no-underline"
      >
        AIMaster 회원가입 하러가기
      </a>
      <p className="mt-5 text-center text-xs text-slate-400">
        이미 계정이 있으신가요?{" "}
        <Link href="/login" className="font-bold text-rose-400 underline hover:text-rose-300">
          로그인하러 가기
        </Link>
      </p>
    </div>
  );
}
