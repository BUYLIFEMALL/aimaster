"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, UserPlus, LogIn, ExternalLink } from "lucide-react";

const MAIN_SITE_URL = "https://www.buylife.xyz";

export default function LoginForm({ next, confirmed = false }: { next: string; confirmed?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(confirmed ? "메일 인증이 끝났습니다. 가입한 이메일과 비밀번호로 로그인해 주세요." : "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createClient();
    try {
      if (mode === "signup") {
        const emailRedirectTo = `${window.location.origin}/api/threads-content-ops/auth/confirm?next=${encodeURIComponent(next)}`;
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo } });
        if (error) throw error;
        if (!data.session) {
          setMessage("가입 확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.");
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
      router.push(next);
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      setMessage(
        /Invalid login credentials/i.test(raw)
          ? "이메일 또는 비밀번호가 맞지 않습니다."
          : /Email not confirmed/i.test(raw)
          ? "가입 확인 메일의 링크를 먼저 눌러 주세요."
          : /already registered/i.test(raw)
          ? "이미 가입된 이메일입니다. 로그인해 주세요."
          : /Password should be/i.test(raw)
          ? "비밀번호는 6자 이상으로 정해 주세요."
          : `처리하지 못했습니다: ${raw}`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-[#090D14] text-white selection:bg-amber-500/30 selection:text-amber-200"
      style={{
        backgroundImage: "radial-gradient(rgba(245, 158, 11, 0.12) 1px, transparent 1px)",
        backgroundSize: "24px 24px",
      }}
    >
      <div className="w-full max-w-[440px] mx-auto flex flex-col items-center">
        {/* 1단계: [맨 위] 프로그램 고유 로고 (64px 라운드 스퀘어 심볼) */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-black text-white shadow-xl shadow-amber-500/20 flex items-center justify-center mb-3.5 border-2 border-amber-500/40">
          <span className="text-2xl font-black text-amber-400">@</span>
        </div>

        {/* 2단계: [그 밑] 프로그램 영문명 알약 캡슐 뱃지 */}
        <div className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-neutral-950/90 border border-amber-500/40 text-amber-300 text-[11px] font-extrabold uppercase tracking-wide mb-2.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>AIMASTER THREADS OPS</span>
        </div>

        {/* 3단계: [그 밑] 프로그램 한글명 볼드 메인 타이틀 + 서브 안내 카피 */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">
              Threads 콘텐츠 <span className="text-amber-400">운영 자동화</span>
            </h1>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
              v2.25
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1.5">
            AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
          </p>
        </div>

        {/* 4단계: [중앙] 로그인/회원가입 폼 카드 (2단 세그먼트 + 3D 엠보싱 버튼) */}
        <div className="w-full bg-[#111726]/90 backdrop-blur-xl rounded-2xl border border-amber-500/30 p-6 sm:p-7 shadow-2xl shadow-black/70">
          {/* 2단 탭 세그먼트 */}
          <div className="bg-[#0b101d] p-1.5 rounded-xl border border-neutral-700/60 grid grid-cols-2 gap-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setMessage("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "login"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>로그인</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setMessage("");
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === "signup"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 font-black shadow-md shadow-amber-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>회원가입</span>
            </button>
          </div>

          {message && (
            <div className="mb-5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-300 font-medium">
              {message}
            </div>
          )}

          {mode === "login" ? (
            /* 로그인 탭 */
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">이메일 주소</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@buylife.xyz"
                    className="w-full pl-[42px] pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all outline-hidden"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">비밀번호</label>
                  <a
                    href={`${MAIN_SITE_URL}/forgot-password`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    비밀번호 찾기?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="w-full pl-[42px] pr-4 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/30 transition-all outline-hidden"
                  />
                </div>
              </div>

              {/* 3D 엠보싱 앰버 버튼 */}
              <button
                type="submit"
                disabled={busy}
                className="w-full mt-2 py-3.5 px-4 btn-3d-amber text-xs flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {busy ? (
                  <span>로그인 확인 중...</span>
                ) : (
                  <>
                    <span>로그인 →</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* 회원가입 탭 */
            <div className="space-y-4">
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white mb-1">
                      AIMaster 단일 계정 안내
                    </h3>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      AIMaster는 전 서브프로그램 단일 계정(Single Sign-On)으로 운영됩니다. 메인 플랫폼에서 한 번만 가입하시면 추가 절차 없이 Threads 자동화 스튜디오를 즉시 이용하실 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>500자 단문 바이럴 글감 수집 및 6대 페르소나 자동 생성</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>회원 본인 Threads 계정 및 AI 키 연동 격리 보관</span>
                </div>
              </div>

              <a
                href={`${MAIN_SITE_URL}/register`}
                target="_blank"
                rel="noreferrer"
                className="w-full mt-2 py-3.5 px-4 btn-3d-amber text-xs flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>AIMaster에서 무료 회원가입하기</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* 5단계: [맨 아래] 약관 문구 1행 축소 처리 (필수 규격 준수) */}
          <div className="mt-5 pt-4 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-400 whitespace-nowrap">
              진행 시{" "}
              <a
                href={`${MAIN_SITE_URL}/terms`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 underline font-semibold hover:text-white"
              >
                이용약관
              </a>
              {" "}및{" "}
              <a
                href={`${MAIN_SITE_URL}/privacy`}
                target="_blank"
                rel="noreferrer"
                className="text-slate-300 underline font-semibold hover:text-white"
              >
                개인정보 처리방침
              </a>
              에 동의합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
