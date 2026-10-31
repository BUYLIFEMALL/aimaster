import { PageHero } from "@/components/ui/PageHero";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { ChannelSwitches, EmailCard, KakaoCard } from "@/components/settings/ChannelCards";
import { ExtensionConnect } from "@/components/settings/ExtensionConnect";
import { AiEngineCard } from "@/components/settings/AiEngineCard";
import { ConfirmButton, SetupTable } from "@/components/settings/SetupTable";
import { stepBadge } from "@/components/settings/setupStyles";
import { deleteResendKeyAction } from "@/lib/actions/channels";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { aiKeyTails, getKakaoState, getResendKey, hasKakaoKey } from "@/lib/notifyChannels";
import { APP_VERSION } from "@/lib/version";

const THIS_PROGRAM_SLUG = "commercial-land-trade-alert";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ kakao?: string; kakao_error?: string }> }) {
  const sp = await searchParams;
  const user = await requireUser();
  const supabase = await createClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const [{ data }, { data: prefs }, { count: extCount }, resend, kakaoKey, kakao, aiTails] = await Promise.all([
    supabase.from("user_telegram_links").select("program_slug, bot_username, linked_at").eq("user_id", user.id).not("bot_token", "is", null).order("linked_at", { ascending: false }),
    supabase.from("commercial_land_preferences").select("notify_telegram, notify_email, email_to, notify_kakao").eq("user_id", user.id).maybeSingle(),
    supabase.from("personal_access_tokens").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("program_slug", THIS_PROGRAM_SLUG).is("revoked_at", null),
    getResendKey(admin, user.id),
    hasKakaoKey(admin, user.id),
    getKakaoState(admin, user.id, false),
    aiKeyTails(admin, user.id),
  ]);
  const links = (data ?? []) as { program_slug: string; bot_username: string | null }[];
  const own = links.find((l) => l.program_slug === THIS_PROGRAM_SLUG);
  const shared = links[0];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHero badge="🔑 설정" title="API키등록·플랫폼연동" description="알림은 텔레그램/이메일/카카오톡 중 켠 곳으로 보냅니다. 키와 계정은 회원 본인 것만 쓰고, 다른 프로그램에 등록한 값은 그대로 재사용합니다. 공공데이터 키는 필요 없고, AI 키는 AI 요약을 쓸 때만 필요합니다." />
      {sp.kakao === "connected" && <p className="mx-card mt-4 text-sm text-mx-success">✅ 카카오를 연결했어요.</p>}
      {sp.kakao_error && <p className="mx-card mt-4 text-sm text-mx-danger">{sp.kakao_error}</p>}
      <section className="mx-card mt-6">
        <h2 className="mx-section-title"><span className={stepBadge()}>첫 번째 · 필수</span>🧩 크롬 확장</h2>
        <SetupTable
          head={["항목", "상태", "정보"]}
          rows={[{
            id: "extension", name: "🧩 확장", on: (extCount ?? 0) > 0, onLabel: "✓ 연결됨", offLabel: "연결 전",
            info: (extCount ?? 0) > 0 ? `${APP_VERSION} · PC ${extCount}대 연결` : "설치 후 「바로 연결」을 눌러 주세요",
            openLabel: "설치·연결",
            issue: { href: `/downloads/${THIS_PROGRAM_SLUG}-extension-latest.zip`, label: "⬇ 받기" },
            defaultOpen: !extCount,
            detail: <ExtensionConnect version={APP_VERSION} />,
          }]}
        />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title"><span className={stepBadge()}>두 번째 · 필수</span>📨 알림 받을 곳 <small className="text-sm font-normal text-mx-muted">하나 이상 연결</small></h2>
        <ChannelSwitches telegram={prefs?.notify_telegram ?? true} email={prefs?.notify_email ?? false} emailTo={prefs?.email_to ?? ""} kakao={prefs?.notify_kakao ?? false} />
        <SetupTable
          head={["받는 곳", "상태", "연결 정보"]}
          rows={[
            {
              id: "telegram", name: "📨 텔레그램", sub: "요약 + 엑셀", on: !!(own || shared),
              info: own ? `@${own.bot_username ?? "봇"}` : shared ? `@${shared.bot_username ?? "봇"} (다른 프로그램에 연결한 봇)` : "회원님 텔레그램 봇 토큰으로 연결",
              quick: own ? <ConfirmButton label="끊기" confirm="텔레그램 연결을 끊어요" action={disconnectTelegramAction} /> : null,
              issue: { href: "https://t.me/BotFather", label: "발급 ↗" },
              openLabel: own || shared ? "방법" : "연결하기",
              detail: (
                <>
                  <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-mx-muted">
                    <li>텔레그램에서 BotFather로 본인 봇을 만들고 토큰을 복사합니다.</li>
                    <li>만든 봇을 열어 아무 메시지나 한 번 보냅니다.</li>
                    <li>아래에 토큰을 넣고 「연동 확인하기」를 누릅니다.</li>
                  </ol>
                  <TelegramConnectForm />
                </>
              ),
            },
            {
              id: "email", name: "✉️ 이메일", sub: "요약 + 엑셀", on: !!resend,
              info: resend ? `••••${resend.slice(-4)} · ${prefs?.email_to || "받는 주소 없음"}` : "Resend(무료) 키로 보내요",
              quick: resend ? <ConfirmButton label="삭제" confirm="Resend 키를 지워요" action={deleteResendKeyAction} /> : null,
              issue: { href: "https://resend.com/api-keys", label: "발급 ↗" },
              detail: <EmailCard hasKey={!!resend} />,
            },
            {
              id: "kakao", name: "💬 카카오톡", sub: "요약만", on: kakao.status === "ok", onLabel: "✓ 연결됨",
              info: kakao.status === "ok" ? kakao.nickname || "카카오 계정" : kakaoKey ? "앱 키 저장됨 · 연결 전" : "회원님 카카오 앱으로 연결",
              issue: { href: "https://developers.kakao.com/console/app", label: "발급 ↗" },
              defaultOpen: !!sp.kakao_error,
              detail: <KakaoCard hasKey={kakaoKey} connected={kakao.status === "ok"} message={kakao.status === "ok" ? "" : kakao.message} />,
            },
          ]}
        />
      </section>
      <section className="mx-card mt-4 border-2 border-green-300">
        <h2 className="mx-section-title"><span className={stepBadge(true)}>세 번째 · 선택</span>🤖 AI 요약 엔진 <small className="text-sm font-normal text-mx-muted">OpenAI / Claude / Gemini 중 선택</small></h2>
        <AiEngineCard email={user.email ?? ""} tails={aiTails} />
      </section>
      <section className="mx-card mt-4">
        <h2 className="mx-section-title">📖 연동 매뉴얼</h2>
        <GuideLinkButton guideId="f43e8ebe-a930-4933-b965-7068b38d79aa" label="텔레그램 봇 만들기" />
      </section>
    </div>
  );
}
