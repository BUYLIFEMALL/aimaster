import { requireProgramAccess } from "@/lib/access";
import { Shell } from "@/components/Shell";
import { MovedNotice } from "@/components/MovedNotice";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) { const user = await requireProgramAccess(); return (
    <Shell email={user.email || ""}>
      {/* 2026-11-01 블로그 9→5: 기능을 SEO 스튜디오로 옮김(원본은 계속 사용 가능) */}
      <MovedNotice
        targets={[{ name: "SEO 스튜디오", href: "https://naver-blog-seo-studio.buylife.xyz" }]}
        features={["제목·원고·다듬기·점검", "참고 사진 「제품 그대로 넣기」", "ZIP(글+이미지) 내려받기", "크롬 확장 자동 발행·예약"]}
      />
      {children}
    </Shell>
  );
}
