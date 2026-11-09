import { FmsBgmReceiver } from "@/components/views/FmsBgmReceiver";
// v1.46 AI 무료음악 「쇼츠 배경음악으로」 받기 전용 — next.config.ts가 이 경로만 교차 출처 격리 헤더를 빼서 window.opener가 살아 있다
export default function FmsBgmPage() {
  return <FmsBgmReceiver />;
}
