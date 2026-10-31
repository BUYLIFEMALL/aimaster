import { BrandMark } from "@/components/ui/BrandMark";

// 로그인·회원가입 화면 공통 틀 — 모든 프로그램 같은 레이아웃(2026-10-01 주인님 지시, 기준: ai-auto-blog/app/auth).
// 격자 배경 + 파란 프로그램 이름 + 안내 문구. 카드(로그인 폼)는 각 페이지가 그린다.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{
        // 작업 화면과 같은 밝은 배경
        backgroundColor: "#f6f7f9",
        backgroundImage:
          "linear-gradient(to right, rgba(0, 155, 77, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0, 155, 77, 0.05) 1px, transparent 1px), radial-gradient(circle at 50% 50%, transparent 20%, #0b0d11 95%)",
        backgroundSize: "24px 24px, 24px 24px, 100% 100%",
      }}>
      <div className="w-full max-w-[440px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <BrandMark size={44} />
          <h1 className="mb-1 mt-3 text-3xl font-extrabold tracking-tight text-mx-text">상가·건물·토지 실거래 알림</h1>
          <p className="text-sm font-medium text-mx-muted">AIMaster 계정(이메일·비밀번호)으로 로그인하세요.</p>
        </div>
        {children}
      </div>
    </div>
  );
}
