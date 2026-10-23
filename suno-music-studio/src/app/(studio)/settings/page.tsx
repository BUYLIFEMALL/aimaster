import { redirect } from "next/navigation";
// 2026-10-21 음악 병합 M1: 키 등록은 음악(SUNO)자동화 설정에서 한다. 이 주소는 이동 안내 화면으로 보낸다.
export default function SettingsPage() {
  redirect("/");
}
