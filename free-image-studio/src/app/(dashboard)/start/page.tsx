import { requireProgramAccess } from "@/lib/access";
import { StartScreen } from "@/components/studio/StartScreen";

export default async function Page() {
  // 회원 번호를 화면에 넘겨 연결 정보·작업 기록·저장 기록을 회원별로 나눈다(레이아웃의 판정과 같은 요청에서 한 번만 읽는다).
  const user = await requireProgramAccess();
  return <StartScreen memberId={user.id} />;
}
