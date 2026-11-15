import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import GoldGradientText from "@/components/ui/GoldGradientText";

// 2026-11-15 주인님 선택 B안 「누아르 골드 라운지」(시안 D:\PDS\Design\aimaster_main_login_20261115) — 인증 화면 공용 틀
// DESIGN.md 로그인 5단계 골격: 로고 → 영문 배지 → 한글명 → (탭) 카드 → 1행 약관. 로그인 화면(LoginForm)과 같은 모양
// 입력칸은 globals.css `.auth-input`, 단추는 AuthButton

export function AuthShell({ subtitle, tab, extra, children }: { subtitle: string; tab?: "login" | "register"; extra?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        backgroundColor: "#0a0a0f",
        backgroundImage:
          "radial-gradient(circle at 50% 30%, rgba(212,175,55,0.16), transparent 45%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "auto, 40px 40px, 40px 40px",
      }}
    >
      <div className="relative w-full max-w-[440px] text-center">
        <Link href="/" aria-label="AI Master 홈" className="mx-auto grid h-[68px] w-[68px] place-items-center rounded-2xl border border-amber-400/30 bg-gradient-to-br from-[#2a2412] to-[#14120a] shadow-[0_0_40px_rgba(212,175,55,0.25)]">
          <GoldGradientText className="text-2xl font-black">AI</GoldGradientText>
        </Link>
        <span className="mt-4 inline-block rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1 text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300">AI MASTER · BUYLIFE</span>
        <h1 className="mt-3 text-[26px] font-black tracking-tight"><GoldGradientText>AI 마스터</GoldGradientText></h1>
        <p className="mt-1.5 text-sm text-slate-400">{subtitle}</p>
        {extra}

        <section className="mt-7 rounded-[28px] border border-white/10 bg-[rgba(22,22,30,0.72)] p-7 text-left shadow-[0_30px_80px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {tab && (
            <div className="mb-6 grid grid-cols-2 rounded-xl bg-white/5 p-1 text-sm font-semibold">
              {tab === "login" ? (
                <span className="rounded-lg bg-amber-400/15 py-2.5 text-center text-amber-300 ring-1 ring-amber-400/30">로그인</span>
              ) : (
                <Link href="/login" className="py-2.5 text-center text-slate-400 hover:text-slate-200">로그인</Link>
              )}
              {tab === "register" ? (
                <span className="rounded-lg bg-amber-400/15 py-2.5 text-center text-amber-300 ring-1 ring-amber-400/30">회원가입</span>
              ) : (
                <Link href="/register" className="py-2.5 text-center text-slate-400 hover:text-slate-200">회원가입</Link>
              )}
            </div>
          )}
          {children}
          <p className="mt-5 whitespace-nowrap text-center text-xs text-slate-500">
            진행 시 <Link href="/terms" className="font-bold text-amber-300">이용약관</Link> 및 <Link href="/privacy" className="font-bold text-amber-300">개인정보 처리방침</Link>에 동의합니다.
          </p>
        </section>
      </div>
    </div>
  );
}

/** 금색 입체 단추(기본) / 테두리 단추(outline). 옛 GoldButton의 fullWidth·size는 받아서 버림(늘 가득 폭) */
export function AuthButton({ variant = "gold", fullWidth: _f, size: _s, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "outline"; fullWidth?: boolean; size?: string }) {
  const look =
    variant === "outline"
      ? "border border-amber-400/40 bg-transparent py-3 text-amber-300 hover:bg-amber-400/10"
      : "bg-gradient-to-b from-[#f5c842] to-[#d4af37] py-3.5 text-[#1a1405] shadow-[0_5px_0_#8a6d12,0_12px_30px_rgba(245,200,66,0.25)] active:translate-y-[3px] active:shadow-[0_2px_0_#8a6d12]";
  return (
    <button {...rest} className={`flex w-full items-center justify-center gap-1.5 rounded-xl text-base font-extrabold transition disabled:opacity-60 ${look} ${className}`.trim()}>
      {children}
    </button>
  );
}
