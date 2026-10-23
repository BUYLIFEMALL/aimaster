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
        <p>AI 심층 분석과 종합 프로필에 쓸 Google Gemini API 키를 본인 것으로 등록합니다. 검사 자체는 키 없이도 할 수 있습니다.</p>
      </div>
      <KeyManager guideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
