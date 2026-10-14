import { KeyManager } from "@/components/workspace/KeyManager";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">PERSONAL CONNECTION</p><h1>API키등록·플랫폼연동</h1><p>본인 Google Gemini API 키를 등록합니다. 사진 작업에는 이미지 모델의 사용 권한과 결제 설정이 필요할 수 있습니다.</p></div><KeyManager guideUrl={GEMINI_GUIDE_URL}/></>; }
