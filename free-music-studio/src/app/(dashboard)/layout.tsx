import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { MiniPlayer } from "@/components/player/MiniPlayer";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireProgramAccess();

  return (
    <PlayerProvider>
      <div className="flex min-h-screen flex-col bg-[#060911] font-sans text-slate-100 antialiased md:flex-row">
        <Sidebar userEmail={user.email} />
        <main className="min-w-0 flex-1 overflow-y-auto bg-[#060911]">
          {/* 아래 재생바에 가리지 않게 아래 여백 */}
          <div className="mx-auto max-w-6xl p-4 pb-24 sm:p-6 sm:pb-24 md:p-8 md:pb-24">{children}</div>
        </main>
      </div>
      <MiniPlayer />
    </PlayerProvider>
  );
}
