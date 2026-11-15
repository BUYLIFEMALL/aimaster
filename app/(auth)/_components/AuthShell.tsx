import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Crown } from "lucide-react";

// 2026-11-15 주인님 지시: 124번 「럭셔리 부티크 & 누아르 골드 다크」 시안 기준(D:\PDS\Design\124_luxury_noir_gold_login\view_01_main_login.html)
// 인증 화면(로그인·회원가입·이메일 찾기·비밀번호 찾기·재설정) 공용 틀 — DESIGN.md 로그인 5단계 골격: 로고 → 영문 배지 → 한글명 → (탭) 카드 → 1행 약관
// 시안의 쇼핑몰 문구(VIP 부티크 바이어 등)는 메인 사이트에 맞게 바꿈. 입력칸은 globals.css `.auth-input`, 단추는 AuthButton(`.btn-3d-gold`)

export function AuthShell({ subtitle, tab, extra, children }: { subtitle: string; tab?: "login" | "register"; extra?: ReactNode; children: ReactNode }) {
  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center px-4 py-12 text-slate-100"
      style={{ backgroundColor: "#0C0A09", backgroundImage: "radial-gradient(circle at 50% 0%, rgba(217,119,6,0.15) 0%, transparent 70%)" }}
    >
      {/* 은은한 앰버 골드 빛 */}
      <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-amber-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-yellow-600/10 blur-[120px]" />

      {/* 유리 카드 */}
      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-amber-500/20 bg-[#171717]/90 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl md:p-12">
        {/* 1. 로고 */}
        <div className="mb-6 flex justify-center">
          <Link href="/" aria-label="AI Master 홈" className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-yellow-500 p-0.5 shadow-xl shadow-amber-500/10">
            <span className="flex h-full w-full items-center justify-center rounded-[14px] bg-[#12100E] text-amber-400">
              <Crown size={28} aria-hidden />
            </span>
          </Link>
        </div>

        {/* 2·3. 영문 배지 · 한글명 · 안내 */}
        <div className="mb-8 text-center">
          <span className="mb-2 inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-400">AI MASTER · BUYLIFE</span>
          <h1 className="text-2xl font-black tracking-tight text-white">AI 마스터</h1>
          <p className="mt-1.5 text-xs text-slate-400">{subtitle}</p>
          {extra}
        </div>

        {/* 로그인 / 회원가입 탭 */}
        {tab && (
          <div className="mb-6 grid grid-cols-2 rounded-xl border border-amber-500/20 bg-[#0C0A09]/80 p-1 text-sm font-bold">
            {tab === "login" ? (
              <span className="rounded-lg bg-amber-500/15 py-2.5 text-center text-amber-400 ring-1 ring-amber-500/40">로그인</span>
            ) : (
              <Link href="/login" className="py-2.5 text-center text-slate-400 hover:text-slate-200">로그인</Link>
            )}
            {tab === "register" ? (
              <span className="rounded-lg bg-amber-500/15 py-2.5 text-center text-amber-400 ring-1 ring-amber-500/40">회원가입</span>
            ) : (
              <Link href="/register" className="py-2.5 text-center text-slate-400 hover:text-slate-200">회원가입</Link>
            )}
          </div>
        )}

        {/* 4. 폼 */}
        <div className="text-left">{children}</div>

        {/* 5. 1행 약관 */}
        <p className="mt-6 whitespace-nowrap text-center text-[11px] text-slate-500">
          진행 시 <Link href="/terms" className="font-bold text-slate-400 underline hover:text-amber-400">이용약관</Link> 및 <Link href="/privacy" className="font-bold text-slate-400 underline hover:text-amber-400">개인정보 처리방침</Link>에 동의합니다.
        </p>
      </section>
    </div>
  );
}

/** 124번 3D 엠보싱 골드 메탈릭 단추(기본) / 테두리 단추(outline). 옛 GoldButton의 fullWidth·size는 받아서 버림(늘 가득 폭) */
export function AuthButton({ variant = "gold", fullWidth: _f, size: _s, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "gold" | "outline" | "blue"; fullWidth?: boolean; size?: string }) {
  const look = variant === "outline" ? "border border-amber-500/40 bg-transparent py-3 text-amber-400 hover:bg-amber-500/10" : "btn-3d-gold py-3.5 text-[#0C0A09]";
  return (
    <button {...rest} className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-black tracking-wide transition disabled:opacity-60 ${look} ${className}`.trim()}>
      {children}
    </button>
  );
}
