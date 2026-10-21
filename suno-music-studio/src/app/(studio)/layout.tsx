import { requireUser } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
// 2026-10-21 음악 병합 M1: 이 앱은 음악(SUNO)자동화(music-automation)의 「정밀 기획 스튜디오」로 합쳐졌다.
// 카탈로그에서 내려(is_active=false) 프로그램 권한 판정이 막히므로, 회원이 브라우저에 남은 기획을 백업할 수 있게
// 이동 안내 화면은 로그인만 확인한다. 옛 화면 코드(components/)는 정리 전까지 그대로 둔다.
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return <main className="app-main" style={{ marginLeft: 0 }}>{children}</main>;
}
