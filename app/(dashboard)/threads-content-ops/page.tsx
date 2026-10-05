import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Bot, CalendarClock, KeyRound, Send, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient } from "@/lib/supabase/server";
import { APP_VERSION } from "@/threads-content-ops/lib/version";
import DraftComposer from "./DraftComposer";
import WebSetup from "./WebSetup";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "threads-content-ops";
export const metadata = { title: "Threads 콘텐츠 운영 자동화 | AIMaster" };

const steps = [
  [KeyRound, "API 키 등록", "AIMaster API 설정에서 본인의 OpenAI API 키를 등록합니다."],
  [ShieldCheck, "Threads 계정 연동", "본인이 만든 Meta Developers Threads 앱으로 계정을 연결합니다."],
  [Bot, "초안 생성·검토", "웹에서 콘텐츠 초안을 만들고 직접 검토합니다."],
  [Send, "발행·예약", "명시적으로 선택한 글만 발행하거나 예약합니다."],
] as const;

export default async function ThreadsContentOpsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/threads-content-ops";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }
  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) redirect(`/programs/${PROGRAM_SLUG}`);
  const { data: accounts } = await supabase
    .from("tco_threads_accounts")
    .select("id, username")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(1);
  const connectedAccount = accounts?.[0]?.username ?? null;
  const { data: drafts } = await supabase
    .from("tco_posts")
    .select("id, body, created_at, account_id")
    .eq("user_id", user.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(5);

  return <div className="max-w-4xl space-y-6">
    <header><p className="mb-1 text-xs font-medium text-gold">{APP_VERSION} · 웹 서비스 전환 중</p><h1 className="text-2xl font-bold text-white"><GoldGradientText>Threads 콘텐츠 운영 자동화</GoldGradientText></h1><p className="mt-2 text-sm text-subtext">별도 PC 설치 없이 AIMaster 웹에서 회원별 Threads 계정과 콘텐츠 운영을 관리합니다.</p></header>
    <GlassCard><div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10"><CalendarClock size={19} className="text-gold" /></div><div><h2 className="font-bold text-white">웹 기반 서비스로 전환 중입니다</h2><p className="mt-1 text-sm text-subtext">데스크톱 앱·기기 토큰 방식은 사용하지 않습니다. 계정 연동, 초안, 발행 이력과 예약은 모두 회원별 웹 계정 안에서 처리합니다.</p></div></div></GlassCard>
    <WebSetup connectedAccount={connectedAccount} />
    <DraftComposer accounts={accounts ?? []} drafts={drafts ?? []} />
    <div className="grid gap-4 sm:grid-cols-2">{steps.map(([Icon,title,description], index) => <GlassCard key={title}><div className="flex gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-sm font-bold text-blue-300">{index + 1}</span><div><div className="mb-1 flex items-center gap-2"><Icon size={16} className="text-gold" /><h2 className="font-semibold text-white">{title}</h2></div><p className="text-sm text-subtext">{description}</p></div></div></GlassCard>)}</div>
    <GlassCard><h2 className="font-bold text-white">보안·운영 원칙</h2><ul className="mt-3 list-inside list-disc space-y-2 text-sm text-subtext"><li>OpenAI 키와 Meta 앱 자격증명은 회원 본인 것만 연결합니다.</li><li>모든 계정·초안·예약·발행 이력은 회원별로 분리 저장됩니다.</li><li>자동 발행·예약은 기본 OFF이며, 회원이 웹에서 명시적으로 설정한 경우에만 실행됩니다.</li></ul></GlassCard>
  </div>;
}
