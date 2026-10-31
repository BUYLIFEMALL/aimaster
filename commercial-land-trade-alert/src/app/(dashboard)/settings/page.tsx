import { PageHero } from "@/components/ui/PageHero";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { ChannelSwitches, EmailCard, KakaoCard } from "@/components/settings/ChannelCards";
import { ExtensionConnect } from "@/components/settings/ExtensionConnect";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/Button";
import { getKakaoState, getResendKey, hasKakaoKey } from "@/lib/notifyChannels";
import { APP_VERSION } from "@/lib/version";

const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ kakao?: string; kakao_error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const [{ data }, { data: prefs }, resend, kakaoKey, kakao] = await Promise.all([
    supabase.from("user_telegram_links").select("program_slug, bot_username, linked_at").eq("user_id", user.id).not("bot_token", "is", null).order("linked_at", { ascending: false }),
    supabase.from("commercial_land_preferences").select("notify_telegram, notify_email, email_to, notify_kakao").eq("user_id", user.id).maybeSingle(),
    getResendKey(admin, user.id),
    hasKakaoKey(admin, user.id),
    getKakaoState(admin, user.id, false),
  ]);
  const links = (data ?? []) as { program_slug: string; bot_username: string | null }[];
  const own = links.find((l) => l.program_slug === THIS_PROGRAM_SLUG);
  const shared = links[0];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHero badge="🔑 설정" title="API키등록·플랫폼연동" description="알림은 텔레그램/이메일/카카오톡 중 켠 곳으로 보냅니다. 키와 계정은 회원 본인 것만 쓰고, 다른 프로그램에 등록한 값은 그대로 재사용합니다. 공공데이터 키와 AI 키는 필요 없습니다." />
      {sp.kakao === "connected" && <p className="mx-card mt-4 text-sm text-mx-success">✅ 카카오를 연결했어요.</p>}
      {sp.kakao_error && <p className="mx-card mt-4 text-sm text-mx-danger">{sp.kakao_error}</p>}
      <section className="mx-card mt-6">
        <h2 className="mx-section-title">🧩 크롬 확장 (감시 대상 수집용)</h2>
        <ExtensionConnect version={APP_VERSION} />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">🔔 받는 곳 켜기</h2>
        <ChannelSwitches telegram={prefs?.notify_telegram ?? true} email={prefs?.notify_email ?? false} emailTo={prefs?.email_to ?? ""} kakao={prefs?.notify_kakao ?? false} />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">📨 텔레그램</h2>
        {own && (
          <>
            <p className="mb-3 text-sm text-mx-success">@{own.bot_username ?? "봇"} 연결됨</p>
            <form action={disconnectTelegramAction}>
              <Button type="submit" variant="secondary">
                연결 끊기
              </Button>
            </form>
          </>
        )}
        {!own && (
          <>
            {shared && <p className="mb-3 text-sm text-mx-success">다른 프로그램에 연결한 @{shared.bot_username ?? "봇"}로 알림을 보냅니다. 다른 봇을 쓰려면 아래에서 연결해 주세요.</p>}
            <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-mx-muted">
              <li>텔레그램에서 BotFather로 본인 봇을 만들고 토큰을 복사합니다.</li>
              <li>만든 봇을 열어 아무 메시지나 한 번 보냅니다.</li>
              <li>아래에 토큰을 넣고 「연동 확인하기」를 누릅니다.</li>
            </ol>
            <TelegramConnectForm />
          </>
        )}
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">✉️ 이메일</h2>
        <EmailCard hasKey={!!resend} />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">💬 카카오톡</h2>
        <KakaoCard hasKey={kakaoKey} connected={kakao.status === "ok"} message={kakao.status === "ok" ? "" : kakao.message} />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">📖 연동 매뉴얼</h2>
        <GuideLinkButton guideId="f43e8ebe-a930-4933-b965-7068b38d79aa" label="텔레그램 봇 만들기" />
      </section>
    </div>
  );
}
