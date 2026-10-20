import { KeyManager } from "@/components/workspace/KeyManager";
import { ScheduleSettings } from "@/components/workspace/ScheduleSettings";
import { GEMINI_GUIDE_URL } from "@/lib/guides";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 계정 연결</p>
        <h1>API키등록·플랫폼연동</h1>
        <p>만화 생성(대본·캐릭터·그림)에 쓸 Google Gemini API 키를 본인 것으로 등록합니다. 인스타그램 게시는 INSTA 포스팅 자동화에서 한 번 연결한 계정을 그대로 쓰고, 예약 게시 실행 방식은 아래 「⏰ 예약 발행」에서 고릅니다.</p>
      </div>
      <KeyManager guideUrl={GEMINI_GUIDE_URL} />
      {/* v1.18 인스타 예약 게시 실행 방식(지침 docs/SCHEDULER_POLICY.md) */}
      <ScheduleSettings />
    </>
  );
}
