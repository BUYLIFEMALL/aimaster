import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Download, KeyRound, MonitorCog, ShieldCheck } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import { createClient } from "@/lib/supabase/server";
import TokenManager from "./TokenManager";
import { APP_VERSION } from "@/threads-content-ops/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "threads-content-ops";

export const metadata = { title: "Threads 콘텐츠 운영 자동화 | AIMaster" };

export default async function ThreadsContentOpsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/threads-content-ops";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) redirect(`/programs/${PROGRAM_SLUG}`);

  const { data: tokens } = await supabase
    .from("personal_access_tokens")
    .select("id, label, created_at, last_used_at")
    .eq("user_id", user.id)
    .eq("program_slug", PROGRAM_SLUG)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl space-y-6">
      <header>
        <p className="mb-1 text-xs font-medium text-gold">{APP_VERSION}</p>
        <h1 className="text-2xl font-bold text-white"><GoldGradientText>Threads 콘텐츠 운영 자동화</GoldGradientText></h1>
        <p className="mt-2 text-sm text-subtext">AIMaster 계정과 연결한 Windows 앱에서 여러 Threads 콘텐츠 작업을 안전하게 관리합니다.</p>
      </header>

      <GlassCard>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10"><MonitorCog size={19} className="text-blue-400" /></div>
          <div>
            <h2 className="font-bold text-white">데스크톱 앱 준비 중</h2>
            <p className="mt-1 text-sm text-subtext">현재 AIMaster 연동과 보안 전환을 진행 중입니다. 설치 파일은 검증이 끝난 뒤 이 페이지에서 제공합니다.</p>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/10"><KeyRound size={18} className="text-gold" /></div>
          <div><h2 className="font-bold text-white">AIMaster 계정 연동</h2><p className="text-xs text-subtext">기기별 토큰을 발급해 데스크톱 앱에 연결합니다.</p></div>
        </div>
        <TokenManager initialTokens={tokens ?? []} />
      </GlassCard>

      <GlassCard>
        <div className="mb-3 flex items-center gap-3"><ShieldCheck size={19} className="text-emerald-400" /><h2 className="font-bold text-white">출시 후 연결 순서</h2></div>
        <ol className="list-inside list-decimal space-y-2 text-sm text-subtext">
          <li>Windows 앱을 다운로드하고 실행합니다.</li>
          <li>이 페이지에서 발급한 연동 토큰을 앱에 한 번만 붙여넣습니다.</li>
          <li>본인 OpenAI 등 AI API 키와 본인 Meta Developers Threads 앱을 연결합니다.</li>
          <li>초안을 검토한 뒤 본인 계정으로 게시하거나, 명시적으로 켠 예약만 실행합니다.</li>
        </ol>
      </GlassCard>

      <div className="flex items-center gap-2 text-xs text-subtext"><Download size={14} /> 설치 파일 및 연동 매뉴얼은 보안 검증 완료 후 제공됩니다.</div>
    </div>
  );
}
