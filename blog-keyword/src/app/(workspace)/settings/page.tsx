import { KeyManager } from "@/components/workspace/KeyManager";
import { PageHero } from "@/components/ui/PageHero";
import { GEMINI_GUIDE_URL, NAVER_ADS_GUIDE_URL, NAVER_SEARCH_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return (
    <>
      <PageHero
        badge="🔑 내 계정 연결"
        title="API키등록·플랫폼연동"
        description="AI 분석에 쓸 Google Gemini 키와, 상위 블로그·뉴스·트렌드 조회에 쓸 네이버 검색 API 키를 본인 것으로 등록합니다. 검색광고 키는 선택입니다."
        tip="등록 후 각 칸의 [연결 확인]으로 키가 동작하는지 바로 확인하세요."
      />
      <KeyManager guides={{ gemini: GEMINI_GUIDE_URL, naver: NAVER_SEARCH_GUIDE_URL, ads: NAVER_ADS_GUIDE_URL }} />
    </>
  );
}
