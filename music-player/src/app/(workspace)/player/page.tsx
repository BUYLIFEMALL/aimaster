import { requireProgramAccess } from "@/lib/access";
import { Player } from "@/components/player/Player";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function PlayerPage() {
  const user = await requireProgramAccess();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 음악 플레이어</p>
        <h1>음악을 끌어다 놓고 바로 들어 보세요</h1>
        <p>파일은 서버로 올라가지 않고 이 기기의 브라우저에만 저장됩니다. 다음에 접속해도 재생목록과 이퀄라이저 설정이 그대로 남습니다.</p>
      </div>
      <Player userId={user.id} />
    </>
  );
}
