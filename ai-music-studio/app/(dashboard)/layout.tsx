import { requireProgramAccess } from "@/lib/access";
import { Sidebar } from "@/components/layout/Sidebar";
import { PlayerProvider } from "@/components/player/PlayerProvider";
import { MiniPlayer } from "@/components/player/MiniPlayer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireProgramAccess();

  return (
    <PlayerProvider>
      <div className="flex min-h-screen flex-col md:flex-row bg-[#09090b]">
        <Sidebar userEmail={user.email ?? ""} />
        {/* v1.11 아래 고정 미니 플레이어·휴대폰 만들기 막대에 본문 끝이 가리지 않게 아래 여백 */}
        <main className="flex-1 p-4 pb-28 md:p-8 md:pb-28 min-w-0 max-w-7xl">
          {children}
        </main>
      </div>
      <MiniPlayer />
    </PlayerProvider>
  );
}
