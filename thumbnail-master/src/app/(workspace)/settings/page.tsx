import { KeyManager } from "@/components/workspace/KeyManager";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 계정 연결</p>
        <h1>API키등록·플랫폼연동</h1>
        <p>전략 분석과 썸네일 이미지 생성에 쓸 Google Gemini API 키를 본인 것으로 등록합니다. 이미지 생성은 결제(유료) 설정이 된 키가 필요할 수 있습니다.</p>
      </div>
      <KeyManager guideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
