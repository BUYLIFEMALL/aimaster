import { redirect } from "next/navigation";

// 2026-10-31: 예약 설정은 매물 감시 화면으로 합쳤다. 대시보드·확장 팝업·옛 링크를 위해 주소만 남긴다.
export default function SchedulePage() {
  redirect("/targets#schedule");
}
