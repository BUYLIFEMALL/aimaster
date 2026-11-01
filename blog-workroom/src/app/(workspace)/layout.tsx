import { requireProgramAccess } from "@/lib/access";
import { Shell } from "@/components/layout/Shell";
import { MovedNotice } from "@/components/MovedNotice";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();
  // v1.12 (BC-05): 보관 기간 안내
  return (
    <Shell email={user.email}>
      {/* 2026-11-01 블로그 9→5: 기능을 SEO 스튜디오·키워드로 옮김(원본은 계속 사용 가능) */}
      <MovedNotice
        targets={[{ name: "SEO 스튜디오", href: "https://naver-blog-seo-studio.buylife.xyz" }, { name: "키워드", href: "https://blog-keyword.buylife.xyz" }]}
        features={["6영역 AI 검수·제안 반영", "내 문체 보관(최신 글 30개까지)", "이미지 비율·이미지별 참고 사진", "서식 복사·파일 내보내기", "키워드 등급·급상승·벤치마킹(키워드)"]}
      />
      {children}
      <p className="retention-note" style={{ margin: "28px 0 8px", color: "#6b7280", fontSize: 12 }}>🗂️ 만든 작업(키워드·자료·초안·최종본·이미지)은 만든 날부터 30일 뒤 자동으로 삭제됩니다. 내 블로그·문체와 설정은 계속 보관됩니다.</p>
    </Shell>
  );
}
