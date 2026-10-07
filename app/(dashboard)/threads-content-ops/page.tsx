import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cleanupUserMedia } from "@/threads-content-ops/lib/mediaCleanup";
import { APP_VERSION } from "@/threads-content-ops/lib/version";
import { THREADS_CONTENT_OPS_CALLBACK_URI } from "@/threads-content-ops/lib/oauth";
import AttentionComposer from "./AttentionComposer";
import DraftComposer from "./DraftComposer";
import ContentOpsSidebar from "./ContentOpsSidebar";
import AccountOperations from "./AccountOperations";
import SourceQueue from "./SourceQueue";
import ViralCollector from "./ViralCollector";
import OperationsDashboard from "./OperationsDashboard";
import WebSetup from "./WebSetup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const PROGRAM_SLUG = "threads-content-ops";
export const metadata = { title: "Threads 콘텐츠 운영 자동화 | AIMaster" };

export default async function ThreadsContentOpsPage({ searchParams }: { searchParams: { tab?: string; viral?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/threads-content-ops";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  if (!(await checkProgramAccess(supabase, user.id, PROGRAM_SLUG)).allowed) redirect(`/programs/${PROGRAM_SLUG}`);

  // 30일 지난 내 미디어 파일은 콘텐츠 생성·초안 화면을 열 때 함께 정리한다(하루 1회 크론과 별개로 동작). 실패해도 화면에는 영향 없음.
  if (searchParams.tab === "create" || searchParams.tab === "manage") {
    try { await cleanupUserMedia(createServiceClient(), user.id); } catch { /* 정리 실패는 무시 */ }
  }

  const { data: accounts } = await supabase.from("tco_threads_accounts")
    .select("id, username, token_expires_at").eq("user_id", user.id).order("updated_at", { ascending: false });
  const [{ data: posts }, { data: credentials }, { data: operationProfiles }, { data: contentSources }, { data: viralCandidates }, { data: viralCategories }] = await Promise.all([
    supabase.from("tco_posts")
    .select("id, body, status, created_at, scheduled_at, published_at, permalink, error_message, account_id, media")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("tco_operation_profiles")
      .select("account_id, topic, personality, tone, target_audience, forbidden_topics, forbidden_expressions, daily_ratio, promotional_ratio, daily_post_target, comment_check_interval_minutes, operating_start, operating_end, automation_enabled, updated_at")
      .eq("user_id", user.id),
    supabase.from("tco_content_sources")
      .select("id, account_id, source_type, title, source_url, summary, metadata, status, created_at, updated_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    supabase.from("tco_viral_candidates")
      .select("id, method, source_input, title, content, keywords, status, category_id, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(300),
    supabase.from("tco_viral_categories")
      .select("id, name, sort_order").eq("user_id", user.id).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  const connectedAccountInfos = (accounts ?? []).map((account) => ({ id: account.id, username: account.username, tokenExpiresAt: account.token_expires_at }));
  const drafts = (posts ?? []).filter((post) => post.status === "draft" || post.status === "scheduled" || post.status === "failed").slice(0, 20);
  const usableViral = (viralCandidates ?? []).filter((candidate) => candidate.status !== "archived");
  const tab = ["dashboard", "viral", "create", "manage", "accounts", "sources", "settings"].includes(searchParams.tab ?? "") ? searchParams.tab! : "dashboard";

  return <div className="threads-content-ops-light flex min-h-screen bg-white text-neutral-900">
    <ContentOpsSidebar email={user.email ?? ""} />
    <div className="mx-auto min-w-0 max-w-6xl flex-1 space-y-6 bg-white p-4 pt-16 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-xs font-medium text-gold">{APP_VERSION} · WEB AUTOMATION</p><h1 className="text-2xl font-bold text-white"><GoldGradientText>Threads 콘텐츠 운영 자동화</GoldGradientText></h1></div><p className="text-sm text-subtext">회원별 계정·초안·발행 이력 분리 관리</p></header>
    {tab === "dashboard" && <OperationsDashboard accounts={accounts ?? []} posts={posts ?? []} configuredProviders={(credentials ?? []).map((credential) => credential.provider)} sources={(contentSources ?? []).map((source) => ({ source_type: source.source_type, status: source.status }))} />}
    {tab === "create" && (accounts?.length ? <AttentionComposer userId={user.id} accounts={accounts} products={(contentSources ?? []).filter((source) => (source.source_type === "coupang" || source.source_type === "naver_brand_connect") && source.status !== "archived" && source.source_url).map((source) => ({ id: source.id, source_type: source.source_type, title: source.title ?? "", summary: source.summary ?? "", source_url: source.source_url, price: Number((source.metadata as { price?: unknown } | null)?.price) > 0 ? Number((source.metadata as { price?: unknown }).price) : null }))} viralCandidates={usableViral} initialViralId={searchParams.viral} configuredProviders={(credentials ?? []).map((credential) => credential.provider)} /> : <GlassCard><h2 className="font-bold text-white">Threads 계정을 먼저 연결하세요</h2><p className="mt-2 text-sm text-subtext">계정 연결 후 본인 API 키로 AI 초안을 만들 수 있습니다.</p></GlassCard>)}
    {tab === "manage" && (accounts?.length ? <DraftComposer accounts={accounts} drafts={drafts} /> : <GlassCard><h2 className="font-bold text-white">보관된 콘텐츠가 없습니다</h2><p className="mt-2 text-sm text-subtext">계정 연결 후 콘텐츠 생성 메뉴에서 초안을 만드세요.</p></GlassCard>)}
    {tab === "accounts" && <AccountOperations accounts={accounts ?? []} profiles={operationProfiles ?? []} />}
    {tab === "viral" && <ViralCollector candidates={viralCandidates ?? []} categories={viralCategories ?? []} configuredProviders={(credentials ?? []).map((credential) => credential.provider)} />}
    {tab === "sources" && <SourceQueue accounts={accounts ?? []} sources={contentSources ?? []} configuredProviders={(credentials ?? []).map((credential) => credential.provider)} />}
    {tab === "settings" && <div><div className="mb-6 flex items-center gap-2"><Settings2 size={18} className="text-gold" /><div><h2 className="font-bold text-neutral-900">API키등록·플랫폼연동</h2><p className="mt-1 text-sm text-neutral-600">플랫폼별 키를 개별 저장하고 등록 상태를 확인하세요.</p></div></div><WebSetup connectedAccounts={connectedAccountInfos} maskedCredentials={Object.fromEntries((credentials ?? []).map((credential) => [credential.provider, maskCredential(credential.api_key)]))} redirectUri={THREADS_CONTENT_OPS_CALLBACK_URI} /></div>}
    </div>
  </div>;
}

function maskCredential(value: string) {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.min(10, value.length - 8))}${value.slice(-4)}`;
}
