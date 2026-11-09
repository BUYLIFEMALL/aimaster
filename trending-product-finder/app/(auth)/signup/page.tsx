import Link from "next/link";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export default function SignupPage() {
  return (
    <div className="w-full">
      {/* 1. [맨 위] 프로그램 고유 로고 */}
      <div className="mb-4 flex justify-center">
        <div className="flex h-[68px] w-[68px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#06B6D4] to-[#0284C7] text-3xl shadow-lg shadow-mx-primary/25 ring-1 ring-white/20">
          📈
        </div>
      </div>

      {/* 2. [그 밑] 프로그램 영문명 */}
      <div className="mb-3 flex justify-center">
        <span className="rounded-full border border-mx-primary/40 bg-mx-primary/15 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-mx-link">
          AIMASTER TRENDING PRODUCT FINDER
        </span>
      </div>

      {/* 3. [그 밑] 프로그램 한글명 */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-black tracking-tight text-mx-text">
          실시간 급상승 소싱 트렌드 발굴기
        </h1>
        <p className="mt-1 text-xs font-semibold text-mx-muted">
          회원가입은 AIMaster 공식 홈페이지에서 진행됩니다.
        </p>
      </div>

      {/* 4. [중앙] 카드 */}
      <div className="rounded-2xl border border-mx-border bg-mx-surface p-7 text-center shadow-2xl shadow-black/40">
        <h2 className="mb-2 text-base font-bold text-mx-text">통합 회원가입 안내</h2>
        <p className="mb-6 text-xs leading-relaxed text-mx-muted">
          본 프로그램은 AIMaster 통합 계정과 멤버십 구독 권한을 사용합니다.
          <br />
          AIMaster에서 회원가입 완료 후 바로 이용하실 수 있습니다.
        </p>
        <a
          href={`${MAIN_SITE_URL}/register`}
          target="_blank"
          rel="noreferrer"
          className="btn-3d-cyan block w-full py-3.5 text-center text-sm font-black"
        >
          AIMaster 회원가입 바로가기 →
        </a>
        <p className="mt-5 text-center text-xs font-semibold text-mx-muted">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="font-bold text-mx-link hover:underline">
            로그인하기
          </Link>
        </p>

        {/* 5. [맨 아래] 약관 문구 1행 축소 처리 */}
        <p className="mt-6 text-center text-[11px] font-medium tracking-tight text-mx-muted whitespace-nowrap">
          진행 시{" "}
          <a href={`${MAIN_SITE_URL}/terms`} target="_blank" rel="noreferrer" className="font-semibold text-mx-text underline">
            이용약관
          </a>
          {" "}및{" "}
          <a href={`${MAIN_SITE_URL}/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-mx-text underline">
            개인정보 처리방침
          </a>
          에 동의합니다.
        </p>
      </div>
    </div>
  );
}
