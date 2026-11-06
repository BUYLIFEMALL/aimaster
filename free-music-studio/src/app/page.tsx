import { redirect } from "next/navigation";

// 첫 화면은 홈(2026-11-06, 원본 boks-music처럼 「음악이 시작되는 나의 공간」부터)
export default function RootPage() {
  redirect("/home");
}
