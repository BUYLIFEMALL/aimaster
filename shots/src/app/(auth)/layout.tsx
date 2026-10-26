import { Play } from "lucide-react";
import { APP_VERSION } from "@/lib/version";

// 로그인·회원가입 화면 공통 틀 (헐리우드 시네마틱 네온 REC 테마 일치화)
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div 
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 bg-[#0b0d1b] text-slate-100" 
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(244, 63, 94, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(244, 63, 94, 0.04) 1px, transparent 1px), radial-gradient(circle at 50% 50%, rgba(244, 63, 94, 0.08) 0%, transparent 70%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-rose-500 to-rose-600 shadow-lg shadow-rose-500/50">
              <Play className="h-5 w-5 fill-white text-white ml-0.5" />
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-rose-950/80 px-2.5 py-0.5 text-xs font-bold text-rose-300 border border-rose-800/80">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-rec-pulse" />
              <span>REC {APP_VERSION}</span>
            </div>
          </div>
          <h1 className="mb-1.5 text-2xl md:text-3xl font-black tracking-tight text-white">
            YOUTUBE Shots 자동화
          </h1>
          <p className="text-xs font-medium text-slate-400">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
