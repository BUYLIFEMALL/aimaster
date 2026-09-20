import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { KeyRound, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";
import TokenManager from "./TokenManager";

// 공개 판매 시작(programs.is_active=true)에 맞춰 로그인-only 체크를
// checkProgramAccess()로 교체함(CLAUDE.md 멀티테넌시 원칙 1번, "로그인 ≠ 이용 권한").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "네이버 블로그 자동화 - 기기 연동" };

const PROGRAM_SLUG = "naver-blog-auto-poster";
const DOWNLOAD_URL =
  "https://github.com/BUYLIFEMALL/aimaster/releases/download/naver-blog-auto-poster-v0.1.0/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe";

export default async function NaverBlogAutoPosterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/naver-blog-auto-poster";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    redirect(`/programs/${PROGRAM_SLUG}`);
  }

  const { data: tokens } = await supabase
    .from("personal_access_tokens")
    .select("id, label, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .eq("program_slug", PROGRAM_SLUG)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>네이버 블로그 자동화 - 기기 연동</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">
          데스크톱 앱에서 이 계정으로 로그인된 것처럼 동작하게 하려면, 여기서 토큰을
          발급받아 앱의 &quot;AIMaster 계정 연동&quot; 화면에 붙여넣으세요.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Download size={18} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">데스크톱 앱 다운로드</h2>
          </div>
          <p className="text-xs text-subtext mb-4">
            Windows용 실행 파일입니다. 설치 없이 바로 실행되는 포터블 프로그램이니, 다운로드
            폴더에서 그대로 더블클릭해서 실행하세요.
          </p>
          <a href={DOWNLOAD_URL}>
            <GoldButton type="button">실행 파일 다운로드 (.exe)</GoldButton>
          </a>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <KeyRound size={18} className="text-gold" />
            </div>
            <h2 className="text-lg font-bold text-white">기기 연동 토큰</h2>
          </div>
          <p className="text-xs text-subtext mb-4">
            토큰은 발급 시 딱 한 번만 화면에 표시됩니다 — 다시 볼 수 없으니 그 자리에서
            바로 복사해서 앱에 붙여넣으세요. 더 이상 쓰지 않는 토큰은 목록에서 폐기할 수
            있습니다.
          </p>
          <TokenManager programSlug={PROGRAM_SLUG} initialTokens={tokens ?? []} />
        </GlassCard>
      </div>
    </div>
  );
}
