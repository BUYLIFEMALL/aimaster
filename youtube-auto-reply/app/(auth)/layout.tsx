import { YtLogo } from "@/components/ui/YtLogo";

// 로그인·회원가입 화면 — 프로그램 전 화면과 같은 유튜브 다크 배경(DESIGN.md 원칙 13).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#0f0f0f", backgroundImage: "radial-gradient(circle at 50% 0%, rgba(255,0,0,0.12), transparent 55%)" }}
    >
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <YtLogo size={40} />
          <h1 className="mb-1 mt-4 text-3xl font-extrabold tracking-tight text-yt-text">유튜브 댓글자동화</h1>
          <p className="text-sm font-medium text-yt-muted">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
