import { GuideContent } from "@/components/workspace/GuideContent";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">사용 설명서</p>
        <h1>연동 & 사용 매뉴얼</h1>
        <p>처음 쓰는 분도 순서대로 따라 하면 화면 설계부터 내보내기까지 할 수 있습니다. 필요한 부분만 골라 보셔도 됩니다.</p>
      </div>
      <GuideContent geminiGuideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
