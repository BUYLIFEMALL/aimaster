import { KeyManager } from "@/components/workspace/KeyManager";
import { GEMINI_GUIDE_URL, NAVER_ADS_GUIDE_URL, NAVER_SEARCH_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 계정 연결</p>
        <h1>API키등록·플랫폼연동</h1>
        <p>AI 분석에 쓸 Google Gemini 키와, 상위 블로그·뉴스·트렌드 조회에 쓸 네이버 검색 API 키를 본인 것으로 등록합니다. 검색광고 키는 선택입니다.</p>
      </div>
      <KeyManager guides={{ gemini: GEMINI_GUIDE_URL, naver: NAVER_SEARCH_GUIDE_URL, ads: NAVER_ADS_GUIDE_URL }} />
    </>
  );
}
