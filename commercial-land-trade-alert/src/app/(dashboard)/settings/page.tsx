import { PageHero } from "@/components/ui/PageHero";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/Button";

const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("user_telegram_links").select("program_slug, bot_username, linked_at").eq("user_id", user.id).not("bot_token", "is", null).order("linked_at", { ascending: false });
  const links = (data ?? []) as { program_slug: string; bot_username: string | null }[];
  const own = links.find((l) => l.program_slug === THIS_PROGRAM_SLUG);
  const shared = links[0];

  return (
    <div className="mx-auto max-w-3xl">
      <PageHero badge="🔑 설정" title="API키등록·플랫폼연동" description="공공데이터 키는 등록하지 않아도 됩니다. 알림을 받으려면 본인 텔레그램 봇만 연결해 주세요." tip="AI 키는 필요 없습니다. 이 프로그램은 AI를 쓰지 않습니다." />
      <section className="mx-card mt-6">
        <h2 className="mx-section-title mb-2">📨 텔레그램 알림</h2>
        {own && (
          <>
            <p className="mb-3 text-sm text-mx-success">@{own.bot_username ?? "봇"} 연결됨</p>
            <form action={disconnectTelegramAction}>
              <Button type="submit" variant="ghost">
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
      <section className="mx-card mt-6">
        <h2 className="mx-section-title mb-3">📖 연동 매뉴얼</h2>
        <GuideLinkButton guideId="f43e8ebe-a930-4933-b965-7068b38d79aa" label="텔레그램 봇 만들기" />
      </section>
    </div>
  );
}
