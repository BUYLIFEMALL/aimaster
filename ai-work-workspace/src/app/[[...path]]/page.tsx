// 워크스페이스 화면: 원본 litpage 화면 전체(자체 라우터가 주소를 읽음)를 이 한 페이지에서 띄운다.
// 들어오기 전에 서버에서 AIMaster 로그인 + 이 프로그램 이용 권한을 확인한다.
import { requireProgramAccess } from "@/lib/access";
import { WorkspaceApp } from "@/components/WorkspaceApp";
import { gmailEnabled } from "@/server/gmailInbox"; // E4 Gmail 스위치(서버 단일 원천) — 워크스페이스 안 받은 업무 화면용

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Page() {
  const user = await requireProgramAccess();
  return <WorkspaceApp email={user.email ?? ""} gmailOn={gmailEnabled()} />;
}
