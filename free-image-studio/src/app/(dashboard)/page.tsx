import { redirect } from "next/navigation";

// 첫 화면은 시작하기다(엔진 연결 상태를 먼저 본다).
export default function HomePage() {
  redirect("/start");
}
