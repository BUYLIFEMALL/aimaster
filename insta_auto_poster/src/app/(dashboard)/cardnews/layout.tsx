import { ProjectProvider } from "@/components/cardnews/studio/ProjectProvider";

// 카드뉴스 스튜디오(2026-10-20 cardnews-studio에서 병합). 로그인·권한은 상위 (dashboard)/layout.tsx가 INSTA 기준으로 확인한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function CardnewsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl">
      <ProjectProvider>{children}</ProjectProvider>
    </div>
  );
}
