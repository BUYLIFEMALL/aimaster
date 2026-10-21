import { redirect } from "next/navigation";

// v1.21(2026-10-21, 이커머스 병합 E2): 상세페이지 자동화로 합쳐져 첫 화면(이동 안내)으로 보낸다.
export default function MovedPage() {
  redirect("/");
}
