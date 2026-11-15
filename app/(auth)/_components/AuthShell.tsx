import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Boxes } from "lucide-react";

// 2026-11-15 사용자 선택 1안 (122. 네오 모던 B2B 커머스 & 코퍼레이트 블루 스타일, neo-b2b-corporate) — 인증 화면 공용 틀
// DESIGN.md 로그인 5단계 골격: 로고 → 영문 배지 → 한글명 → (탭) 카드 → 1행 약관
// 단추: 3D 엠보싱 코발트 블루 버튼 (btn-3d-blue)

export function AuthShell({
  subtitle,
  tab,
  extra,
  children,
}: {
  subtitle: string;
  tab?: "login" | "register";
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#080c14",
        backgroundImage:
          "radial-gradient(circle at 50% 25%, rgba(37,99,235,0.14), transparent 45%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "auto, 32px 32px, 32px 32px",
      }}
    >
      <div className="relative w-full max-w-[480px] text-center">
        {/* 1. 로고 심볼 */}
        <Link
          href="/"
          aria-label="AI Master 홈"
          className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-[0_0_40px_rgba(37,99,235,0.35)] transition hover:scale-105"
        >
          <Boxes size={32} className="text-white" />
        </Link>

        {/* 2. 영문명 배지 */}
        <span className="mt-4 inline-block rounded-full border border-blue-400/30 bg-blue-500/15 px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-blue-300">
          AIMASTER B2B SUITE
        </span>

        {/* 3. 한글 타이틀 */}
        <h1 className="mt-3 text-[26px] font-black tracking-tight text-white">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300">
            AI 마스터
          </span>
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        {extra}

        {/* 4. 폼 카드 */}
        <section className="mt-7 rounded-[28px] border border-slate-800 bg-[#0d1322]/95 p-7 text-left shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {tab && (
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-900/90 p-1 text-sm font-semibold border border-slate-800">
              {tab === "login" ? (
                <span className="rounded-lg bg-blue-600 py-2.5 text-center text-white shadow-md shadow-blue-600/30">
                  로그인
                </span>
              ) : (
                <Link href="/login" className="py-2.5 text-center text-slate-400 hover:text-slate-200">
                  로그인
                </Link>
              )}
              {tab === "register" ? (
                <span className="rounded-lg bg-blue-600 py-2.5 text-center text-white shadow-md shadow-blue-600/30">
                  회원가입
                </span>
              ) : (
                <Link href="/register" className="py-2.5 text-center text-slate-400 hover:text-slate-200">
                  회원가입
                </Link>
              )}
            </div>
          )}
          {children}

          {/* 5. 1행 약관 */}
          <p className="mt-5 whitespace-nowrap text-center text-xs text-slate-500">
            진행 시{" "}
            <Link href="/terms" className="font-bold text-blue-400 hover:underline">
              이용약관
            </Link>{" "}
            및{" "}
            <Link href="/privacy" className="font-bold text-blue-400 hover:underline">
              개인정보 처리방침
            </Link>
            에 동의합니다.
          </p>
        </section>
      </div>
    </div>
  );
}

/** 122번 3D 엠보싱 코발트 블루 버튼(기본) / 아웃라인 / 골드 버튼 지원 */
export function AuthButton({
  variant = "blue",
  fullWidth: _f,
  size: _s,
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "blue" | "gold" | "outline";
  fullWidth?: boolean;
  size?: string;
}) {
  let look = "btn-3d-blue py-3.5 text-white";
  if (variant === "outline") {
    look = "border border-blue-400/40 bg-transparent py-3 text-blue-300 hover:bg-blue-400/10";
  } else if (variant === "gold") {
    look =
      "bg-gradient-to-b from-[#f5c842] to-[#d4af37] py-3.5 text-[#1a1405] shadow-[0_5px_0_#8a6d12,0_12px_30px_rgba(245,200,66,0.25)] active:translate-y-[3px] active:shadow-[0_2px_0_#8a6d12]";
  }

  return (
    <button
      {...rest}
      className={`flex w-full items-center justify-center gap-1.5 rounded-xl text-base font-extrabold transition disabled:opacity-60 cursor-pointer ${look} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
