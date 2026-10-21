import { redirect } from "next/navigation";

// v1.10(2026-10-21, 이커머스 병합 E1): 상세페이지 자동화로 합쳐져 사용 안내는 첫 화면(이동 안내)으로 보낸다.
export default function GuideRoutePage() {
  redirect("/");
}
