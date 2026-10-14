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
        <p>인물 사진 생성에 쓸 Google Gemini API 키를 본인 것으로 등록합니다. 다른 플랫폼 연동은 필요하지 않습니다.</p>
      </div>
      <KeyManager guideUrl={GEMINI_GUIDE_URL} />
    </>
  );
}
