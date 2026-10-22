import { redirect } from "next/navigation";
import { ProjectProvider } from "@/components/cardnews/studio/ProjectProvider";
import { IS_STANDALONE } from "@/lib/deployment";

// 카드뉴스 스튜디오(2026-10-20 cardnews-studio에서 병합). 로그인·권한은 상위 (dashboard)/layout.tsx가 INSTA 기준으로 확인한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CardnewsLayout({ children }: { children: React.ReactNode }) {
  // 배포판(독립 모드) DB에는 카드뉴스 표가 없고 메뉴도 숨긴다 — 주소를 직접 쳐도 대시보드로 보낸다(2026-10-22)
  if (IS_STANDALONE) redirect("/dashboard");
  return (
    <div className="mx-auto max-w-6xl">
      <ProjectProvider>{children}</ProjectProvider>
    </div>
  );
}
