import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWordpressConnection } from "@/lib/wordpressConnect";
import { WordpressConnectCard, type WpInitial } from "@/components/connect/WordpressConnectCard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ConnectPage() {
  const user = await requireProgramAccess();
  const wp = await loadWordpressConnection(createAdminClient(), user.id);
  const initial: WpInitial = wp ? { connected: true, accountId: wp.accountId, siteUrl: wp.siteUrl, username: wp.username } : { connected: false };

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">🔧 발사대 정비</span>
        <h1 className="mt-2 text-3xl font-black">블로그 연결</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">한 번만 연결하면 다음부터는 묻지 않고, 다른 AIMaster 프로그램에서도 그대로 씁니다. 연결 정보는 회원님 계정에만 저장됩니다.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <WordpressConnectCard initial={initial} />
        <div className="lp-card" style={{ boxShadow: "inset 0 8px 0 var(--blogger), 0 8px 26px rgba(15,42,74,.09)" }}>
          <h2 className="pt-1 text-lg font-black">🅑 구글 블로그 연결</h2>
          <p className="mt-2 text-sm text-[color:var(--muted)]">구글 연결 화면은 지금 만드는 중입니다.</p>
        </div>
      </div>
    </div>
  );
}
