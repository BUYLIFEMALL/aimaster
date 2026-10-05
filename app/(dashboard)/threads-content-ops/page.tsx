import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/threads-content-ops/lib/version";
import DraftComposer from "./DraftComposer";
import OperationsDashboard from "./OperationsDashboard";
import WebSetup from "./WebSetup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const PROGRAM_SLUG = "threads-content-ops";
export const metadata = { title: "Threads 콘텐츠 운영 자동화 | AIMaster" };

export default async function ThreadsContentOpsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/threads-content-ops";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  if (!(await checkProgramAccess(supabase, user.id, PROGRAM_SLUG)).allowed) redirect(`/programs/${PROGRAM_SLUG}`);

  const { data: accounts } = await supabase.from("tco_threads_accounts")
    .select("id, username").eq("user_id", user.id).order("updated_at", { ascending: false });
  const { data: posts } = await supabase.from("tco_posts")
    .select("id, body, status, created_at, published_at, permalink, error_message, account_id")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30);
  const connectedAccount = accounts?.[0]?.username ?? null;
  const drafts = (posts ?? []).filter((post) => post.status === "draft").slice(0, 5);

  return <div className="max-w-6xl space-y-6">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-medium text-gold">{APP_VERSION} · WEB AUTOMATION</p><h1 className="text-2xl font-bold text-white"><GoldGradientText>Threads 콘텐츠 운영 자동화</GoldGradientText></h1></div><p className="text-sm text-subtext">회원별 계정·초안·발행 이력 분리 관리</p></header>
    <OperationsDashboard accounts={accounts ?? []} posts={posts ?? []} />
    {accounts?.length ? <DraftComposer accounts={accounts} drafts={drafts} /> : <GlassCard><h2 className="font-bold text-white">첫 자동화 작업을 시작하세요</h2><p className="mt-2 text-sm text-subtext">아래 연결 설정을 완료하면 이 화면에서 AI 초안 생성, 검토, 직접 발행과 이력 관리를 바로 사용할 수 있습니다.</p></GlassCard>}
    <details className="rounded-2xl border border-white/10 bg-white/[0.02] p-5"><summary className="flex cursor-pointer list-none items-center gap-2 font-semibold text-white"><Settings2 size={18} className="text-gold" />연결·API 설정</summary><p className="mt-2 text-sm text-subtext">회원 본인의 OpenAI 키와 Meta Developers Threads 앱만 연결합니다.</p><div className="mt-4"><WebSetup connectedAccount={connectedAccount} /></div></details>
  </div>;
}
