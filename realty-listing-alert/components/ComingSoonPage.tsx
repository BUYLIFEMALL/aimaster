import { requireProgramAccess } from "@/lib/access";
import { StudioSidebar } from "@/components/studio/StudioSidebar";

// 2단계(DB·설정 화면)에서 채울 메뉴의 자리. 권한 확인은 지금부터 그대로 한다.
export default async function ComingSoonPage({ active, icon, title, desc }: { active: string; icon: string; title: string; desc: string }) {
  const user = await requireProgramAccess();
  return (
    <div className="studio-shell">
      <StudioSidebar email={user.email ?? ""} active={active} />
      <main className="main">
        <div className="topline">
          <div>
            <div className="eyebrow">준비 중</div>
            <h1>{icon} {title}</h1>
            <p className="lede">{desc}</p>
          </div>
        </div>
        <section className="card"><p className="lede">이 화면은 다음 업데이트에서 열립니다. 지금은 확장 설치와 연결을 먼저 해 두세요.</p></section>
      </main>
    </div>
  );
}
