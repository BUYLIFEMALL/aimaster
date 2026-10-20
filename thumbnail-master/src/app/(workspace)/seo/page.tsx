import { SeoStudio } from "@/components/seo/SeoStudio";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-20 병합 D: AI 유튜브 썸네일 프로에서 옮겨 온 「SEO 전략」 화면(권한 확인은 (workspace) 레이아웃)
export default function SeoPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">업로드 준비</p>
        <h1>SEO 전략</h1>
        <p>대본이나 아이디어를 넣으면 호기심·가치·스토리 3가지 전략별로 제목·설명·해시태그·스튜디오 태그·고정 댓글을 만들고, 고른 전략으로 바로 썸네일 제작을 시작합니다.</p>
      </div>
      <SeoStudio />
    </>
  );
}
