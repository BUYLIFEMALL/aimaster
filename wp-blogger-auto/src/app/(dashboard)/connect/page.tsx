import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadWordpressConnection } from "@/lib/wordpressConnect";
import { loadBloggerAccount, getGoogleApp } from "@/lib/googleConnect";
import { WordpressConnectCard, type WpInitial } from "@/components/connect/WordpressConnectCard";
import { BloggerConnectCard, type BloggerInitial } from "@/components/connect/BloggerConnectCard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireProgramAccess();
  const sp = await searchParams;
  const admin = createAdminClient();
  const [wp, bl, app] = await Promise.all([loadWordpressConnection(admin, user.id), loadBloggerAccount(admin, user.id), getGoogleApp(admin, user.id)]);

  const wpInitial: WpInitial = wp ? { connected: true, accountId: wp.accountId, siteUrl: wp.siteUrl, username: wp.username } : { connected: false };
  const extra = (bl?.extra ?? {}) as { blog_id?: string; blog_name?: string; blog_url?: string };
  const blInitial: BloggerInitial = bl
    ? { connected: true, hasApp: !!app, accountId: bl.id, email: bl.username, needsReconnect: bl.needsReconnect, blog: extra.blog_id ? { id: extra.blog_id, name: extra.blog_name ?? "", url: extra.blog_url ?? "" } : null }
    : { connected: false, hasApp: !!app };

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">🔧 발사대 정비</span>
        <h1 className="mt-2 text-3xl font-black">블로그 연결</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">한 번만 연결하면 다음부터는 묻지 않고, 다른 AIMaster 프로그램에서도 그대로 씁니다. 연결 정보는 회원님 계정에만 저장됩니다.</p>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <WordpressConnectCard initial={wpInitial} />
        <BloggerConnectCard initial={blInitial} result={{ ok: sp.google === "connected" ? "connected" : undefined, error: sp.google_error }} />
      </div>
    </div>
  );
}
