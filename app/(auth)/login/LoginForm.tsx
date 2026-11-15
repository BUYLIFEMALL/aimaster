"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Boxes,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPhoneNumber } from "@/lib/utils/format";
import { PHONE_REQUIRED_MESSAGE, hasRegisteredPhone, isValidPhone } from "@/lib/utils/phone";

// 2026-11-15 사용자 선택 1안 (122. 네오 모던 B2B 커머스 & 코퍼레이트 블루 스타일, neo-b2b-corporate)
// - 2단 스플릿 레이아웃: 좌측 B2B 파트너십 혜택 배너 + 우측 5단계 표준 규격 로그인 폼
// - 3D 엠보싱 코발트 블루 버튼 (.btn-3d-blue)
// - 5단계 표준 규격 (로고·영문뱃지·타이틀·폼카드·1행 약관) 및 기존 인증/세션제한/휴대폰등록 로직 100% 보존

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<"b2b" | "member">("b2b");

  // 로그인은 됐지만 핸드폰 번호가 없는 회원
  const [needPhone, setNeedPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [phoneName, setPhoneName] = useState("");

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const redirectTo = !redirectParam || redirectParam === "/dashboard" ? "/" : redirectParam;
  const isSessionExpired = searchParams.get("session_expired") === "true";
  const isPasswordReset = searchParams.get("reset") === "1";
  const supabase = createClient();

  useEffect(() => {
    if (isSessionExpired) {
      supabase.auth.signOut({ scope: "local" }).then(() => {
        setError("세션이 만료되었습니다. 다시 로그인해주세요.");
      });
    }
  }, [isSessionExpired, supabase]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (typeof document !== "undefined") {
      document.cookie.split(";").forEach((cookie) => {
        const name = cookie.split("=")[0]?.trim();
        if (name && name.startsWith("sb-")) {
          document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
        }
      });
    }

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(
        authError.status === 429
          ? "로그인 시도가 너무 많습니다. 1~2분 뒤에 다시 시도해주세요."
          : "이메일 또는 비밀번호가 올바르지 않습니다."
      );
      setLoading(false);
      return;
    }

    // 동시 접속 세션 제한
    try {
      const sessionRes = await fetch("/api/session/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_info: navigator.userAgent }),
      });

      if (sessionRes.status === 409) {
        const data = await sessionRes.json();
        setError(data.error || "이미 다른 기기에서 접속 중입니다.");
        await supabase.auth.signOut({ scope: "local" });
        setLoading(false);
        return;
      }
    } catch {
      // 세션 생성 실패해도 진행
    }

    // 핸드폰 번호 확인 (관리자 제외)
    const { data: me } = await supabase.auth.getUser();
    if (me.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("name, phone, is_admin")
        .eq("id", me.user.id)
        .maybeSingle();
      if (profile && !profile.is_admin && !hasRegisteredPhone(profile.phone)) {
        setPhoneName(profile.name ?? "");
        setNeedPhone(true);
        setLoading(false);
        return;
      }
    }

    goNext();
    setLoading(false);
  };

  const goNext = () => {
    if (redirectTo.startsWith("http://") || redirectTo.startsWith("https://")) {
      window.location.href = redirectTo;
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!isValidPhone(phone)) {
      setError("핸드폰 번호를 정확히 입력해주세요. (예: 010-1234-5678)");
      return;
    }
    if (!phoneName.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: phoneName, phone: formatPhoneNumber(phone) }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "저장하지 못했습니다. 잠시 뒤 다시 시도해주세요.");
      setLoading(false);
      return;
    }
    goNext();
    setLoading(false);
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 md:p-8"
      style={{
        backgroundColor: "#080c14",
        backgroundImage:
          "radial-gradient(circle at 15% 25%, rgba(37, 99, 235, 0.12), transparent 40%), radial-gradient(circle at 85% 75%, rgba(59, 130, 246, 0.1), transparent 45%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "auto, auto, 32px 32px, 32px 32px",
      }}
    >
      {/* 122번 메인 2단 스플릿 B2B 컨테이너 */}
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-800 bg-[#0c1220]/95 shadow-[0_30px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* 좌측: B2B 비즈니스 파트너십 비주얼 영역 (데스크톱/태블릿) */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-slate-950 via-[#0a1428] to-[#0d1e3d] p-8 md:p-10 text-white flex flex-col justify-between relative overflow-hidden border-b md:border-b-0 md:border-r border-slate-800/80">
          {/* 배경 앰비언트 글로우 */}
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-indigo-600/20 blur-3xl" />

          {/* 상단 브랜드 & 혜택 소개 */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <Link
                href="/"
                aria-label="AI Master 홈"
                className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30 text-white text-xl font-black transition hover:scale-105"
              >
                <Boxes size={24} className="text-white" />
              </Link>
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-500/20 text-blue-300 border border-blue-400/30 tracking-wider">
                  AIMASTER B2B CORE
                </span>
                <h2 className="text-base font-black tracking-tight text-white flex items-center gap-1.5 mt-0.5">
                  AI 비즈니스 자동화 허브
                </h2>
              </div>
            </div>

            <h1 className="text-2xl md:text-[28px] font-black leading-snug mb-3 tracking-tight text-white">
              사업자 회원을 위한<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-teal-300">
                최적의 도매·자동화 플랫폼
              </span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm leading-relaxed mb-6 font-normal">
              도매 상품 소싱부터 마케팅·SNS 자동 발행, 업무 자동화까지 모든 솔루션을 단 하나의 비즈니스 계정으로 관리하세요.
            </p>

            {/* 3대 B2B 핵심 혜택 리스트 */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition hover:bg-white/[0.07]">
                <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm shrink-0">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">사업자 전용 도매가 & 마진 극대화</p>
                  <p className="text-[11px] text-slate-400">일반가 대비 평균 30~55% 수익 마진 보장</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition hover:bg-white/[0.07]">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm shrink-0">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">세금계산서 100% 자동 발행</p>
                  <p className="text-[11px] text-slate-400">결제 즉시 국세청 홈택스 연동 전자세금계산서</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm transition hover:bg-white/[0.07]">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm shrink-0">
                  <Boxes size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">원클릭 대량 마케팅 자동화</p>
                  <p className="text-[11px] text-slate-400">블로그, SNS, 데이터 수집 파이프라인 무제한</p>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 신뢰도 지표 */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5 text-blue-300 font-semibold">
              <ShieldCheck size={14} className="text-blue-400" />
              <span>SSL 256bit 암호화</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span>검증된 회원사 이용 중</span>
            </div>
          </div>
        </div>

        {/* 우측: 5단계 표준 규격 로그인 폼 영역 */}
        <div className="w-full md:w-7/12 p-8 md:p-12 flex flex-col justify-center bg-[#0d1322]/90">
          
          {needPhone ? (
            /* 휴대폰 번호 추가 입력 폼 */
            <div className="max-w-md mx-auto w-full">
              <div className="mb-6">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  PROFILE SETUP
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight mt-2">
                  회원 정보 등록
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  안전한 서비스 이용을 위해 휴대폰 번호를 등록해주세요.
                </p>
              </div>

              <form onSubmit={handleSavePhone} className="space-y-4">
                <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-xs text-blue-300 leading-relaxed">
                  <p className="font-bold">{PHONE_REQUIRED_MESSAGE}</p>
                  <p className="mt-1 text-slate-400">아래 정보를 입력하시면 즉시 로그인이 완료됩니다.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">이름</label>
                  <input
                    type="text"
                    value={phoneName}
                    onChange={(e) => setPhoneName(e.target.value)}
                    placeholder="홍길동"
                    required
                    className="w-full px-4 py-3 bg-[#131b2e] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">핸드폰 번호</label>
                  <input
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    placeholder="010-1234-5678"
                    required
                    autoFocus
                    className="w-full px-4 py-3 bg-[#131b2e] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-3d-blue w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? "저장 중..." : "핸드폰 번호 저장하고 계속하기"}</span>
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          ) : (
            /* 일반 로그인 폼 */
            <div className="max-w-md mx-auto w-full">
              {/* 5단계 표준 규격 1~3: 뱃지 & 헤드라인 & 가입 링크 */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase bg-blue-500/15 text-blue-400 border border-blue-400/30">
                    AIMASTER B2B SUITE
                  </span>
                  <span className="text-xs text-slate-400">
                    처음이신가요?{" "}
                    <Link href="/register" className="font-bold text-blue-400 hover:text-blue-300 underline underline-offset-2">
                      무료 가입하기
                    </Link>
                  </span>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  통합 비즈니스 로그인
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  등록된 AIMaster 계정 또는 사업자 회원 정보로 로그인하세요.
                </p>
              </div>

              {/* 일반회원 / 사업자회원 2단 세그먼트 탭 */}
              <div className="flex rounded-xl bg-slate-900/90 p-1 mb-6 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoginMode("b2b")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    loginMode === "b2b"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Building2 size={14} />
                  <span>사업자(B2B) 로그인</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLoginMode("member")}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    loginMode === "member"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <User size={14} />
                  <span>일반 회원 로그인</span>
                </button>
              </div>

              {/* 4단계: 로그인 폼 카드 */}
              <form onSubmit={handleLogin} className="space-y-4">
                {/* 이메일 입력창 */}
                <div>
                  <label htmlFor="login-email" className="block text-xs font-bold text-slate-300 mb-1.5">
                    아이디 / 이메일
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail size={16} />
                    </span>
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoFocus
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={loginMode === "b2b" ? "biz@company.com" : "your@email.com"}
                      className="w-full pl-10 pr-4 py-3 bg-[#131b2e] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:bg-[#151f36] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                  </div>
                </div>

                {/* 비밀번호 입력창 */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label htmlFor="login-password" className="text-xs font-bold text-slate-300">
                      비밀번호
                    </label>
                    <span className="text-xs font-semibold">
                      <Link href="/find-email" className="text-slate-400 hover:text-blue-400 transition">
                        이메일 찾기
                      </Link>
                      <span className="mx-1.5 text-slate-600">·</span>
                      <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition">
                        비밀번호 찾기?
                      </Link>
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock size={16} />
                    </span>
                    <input
                      id="login-password"
                      type={showPw ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-3 bg-[#131b2e] border border-slate-700 rounded-xl text-sm text-slate-100 placeholder:text-slate-500 focus:bg-[#151f36] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "비밀번호 숨기기" : "비밀번호 보기"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* 알림 메시지 */}
                {isPasswordReset && !error && (
                  <p className="text-xs bg-blue-500/10 border border-blue-500/30 text-blue-300 rounded-lg px-4 py-2.5">
                    비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인해주세요.
                  </p>
                )}
                {error && (
                  <p className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-2.5">
                    {error}
                  </p>
                )}

                {/* 122번 3D 엠보싱 코발트 블루 버튼 */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-3d-blue w-full py-3.5 rounded-xl text-white font-black text-sm tracking-wide flex items-center justify-center gap-2 mt-5 cursor-pointer disabled:opacity-60"
                >
                  <span>{loading ? "로그인 인증 중..." : "비즈니스 로그인 시작"}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              {/* 간편 회원가입 / B2B 파트너 안내 */}
              <div className="mt-6 pt-5 border-t border-slate-800 text-center">
                <p className="text-xs text-slate-400">
                  아직 회원이 아니신가요?{" "}
                  <Link href="/register" className="font-bold text-blue-400 hover:underline">
                    무료 회원가입으로 14일 체험하기
                  </Link>
                </p>
              </div>

              {/* 5단계 표준 규격: 1행 약관 처리 */}
              <div className="mt-5 text-center">
                <p className="text-[11px] text-slate-500 whitespace-nowrap">
                  진행 시{" "}
                  <Link href="/terms" className="text-slate-400 font-bold underline hover:text-blue-400">
                    이용약관
                  </Link>
                  {" "}및{" "}
                  <Link href="/privacy" className="text-slate-400 font-bold underline hover:text-blue-400">
                    개인정보 처리방침
                  </Link>
                  에 동의합니다.
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
