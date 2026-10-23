import { StudioHeader } from "@/components/dm/ui/StudioHeader";
import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { ReplySettingsForm } from "@/components/dm/settings/ReplySettingsForm";
import { BotEnabledForm } from "@/components/dm/settings/BotEnabledForm";
import { AutoApproveSettingsForm } from "@/components/dm/settings/AutoApproveSettingsForm";
import { WebhookSetupInfo } from "@/components/dm/settings/WebhookSetupInfo";
import { TelegramConnectForm } from "@/components/dm/settings/TelegramConnectForm";
import { ReregisterWebhookButton } from "@/components/dm/settings/ReregisterWebhookButton";
import { GuideLinkButton } from "@/components/dm/settings/GuideLinkButton";
import { getInstagramConnectionStatus } from "@/lib/dmApp/actions/instagram";
import { disconnectTelegramAction } from "@/lib/dmApp/actions/telegram";
import { computeInstagramVerifyToken } from "@/lib/dmApp/instagram/webhookSecret";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  getReplyModelProvider,
} from "@/lib/ai/models";
import { SITE_ORIGIN } from "@/lib/dmApp/oauthRedirect";

export const dynamic = "force-dynamic";

// platform_guides.id — 이 프로그램이 실제로 쓰는 Meta 앱(댓글·DM 자동화)/AI/텔레그램에
// 해당하는 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "4115e455-1585-4304-89b4-d29859fd7a5a", label: "인스타그램 계정 연동하기 (댓글·DM 자동화)" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];


export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, connectionStatus, { data: settings }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getInstagramConnectionStatus(supabase, user.id),
    supabase
      .from("dm_settings")
      .select("default_link, ai_instructions, tone_preset, reply_model, disclosure_message, auto_approve, bot_enabled, bot_started_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "instagram-dm-reply")
      .maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const activeModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const activeModelOption = REPLY_MODEL_OPTIONS.find((o) => o.value === activeModel);
  const activeProvider = getReplyModelProvider(activeModel);

  // DM 웹훅은 Meta 앱에 주소를 하나만 등록할 수 있어 새 주소로 안내한다(같은 서버라 지금 바꿔도 바로 동작, 옛 주소 삭제 대비)
  const webhookCallbackUrl = `${SITE_ORIGIN}/api/instagram/dm-webhook/${user.id}`;
  const webhookVerifyToken = computeInstagramVerifyToken(user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <StudioHeader
        icon="💌"
        title="DM 답변 설정"
        description="DM 웹훅 등록·봇 켜기·답장 방식·텔레그램 DM 봇을 정합니다. Meta 앱 키·AI 키·인스타그램 연결은 「API키등록·플랫폼연동」 한 곳에서 등록합니다."
      />

      {/* 2026-10-20 v1.24: 병합 후 키·인스타 연결은 「API키등록·플랫폼연동」 한 곳 — 여기는 상태만 보여 준다 */}
      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">🔗 DM 답변 연결 상태</h2>
        <ul className="space-y-2 text-sm">
          {[
            { label: "Meta 앱 키 (Instagram 앱 ID·시크릿)", ok: keyMap.has("meta_app_id") && keyMap.has("meta_app_secret") },
            {
              label: connectionStatus.connected
                ? `인스타그램 DM 권한 연결 (@${connectionStatus.username ?? "내 계정"})`
                : "인스타그램 DM 권한 연결 (「DM 답변도 사용」 체크 후 연결)",
              ok: connectionStatus.connected && !connectionStatus.needsReconnect,
            },
            {
              label: `AI 키 — ${activeModelOption?.shortLabel ?? activeModel} (${REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]})`,
              ok: keyMap.has(activeProvider),
            },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between gap-3 rounded-lg bg-ig-raised px-3 py-2.5">
              <span className="min-w-0 text-ig-text">{row.label}</span>
              <span className={`shrink-0 text-xs font-bold ${row.ok ? "text-ig-success" : "text-ig-warn"}`}>
                {row.ok ? "✅ 완료" : "⚠️ 필요"}
              </span>
            </li>
          ))}
        </ul>
        {connectionStatus.needsReconnect && (
          <p className="text-sm text-ig-warn">⚠️ 인스타그램 연결이 만료되었습니다. 다시 연결해 주세요.</p>
        )}
        <a href="/settings" className="inline-block rounded-lg bg-ig-primary px-4 py-2 text-xs font-bold text-white hover:bg-ig-primary-hover">
          🔑 API키등록·플랫폼연동에서 등록·연결하기
        </a>
        <p className="text-xs text-ig-muted">
          키와 인스타그램 연결은 댓글·DM이 함께 씁니다. 한 번 등록하면 두 기능 모두에 적용돼요.
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">🔌 DM 웹훅 설정</h2>
        <WebhookSetupInfo callbackUrl={webhookCallbackUrl} verifyToken={webhookVerifyToken} />
      </section>

      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">🤖 봇 활성화</h2>
        <BotEnabledForm enabled={settings?.bot_enabled ?? false} startedAt={settings?.bot_started_at ?? null} />
      </section>

      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">🔗 답장 기본 설정</h2>
        <ReplySettingsForm
          defaultLink={settings?.default_link ?? null}
          aiInstructions={settings?.ai_instructions ?? null}
          tonePreset={settings?.tone_preset ?? null}
          replyModel={settings?.reply_model ?? null}
          disclosureMessage={settings?.disclosure_message ?? null}
        />
      </section>

      <section className="space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">📨 텔레그램 알림 연동 <span className="ml-1 rounded-full bg-pink-500/15 px-2 py-0.5 align-middle text-xs font-bold text-pink-300">💌 DM 전용 봇</span></h2>
        <p className="rounded-lg border border-pink-500/30 bg-pink-500/10 px-3 py-2 text-xs text-ig-text">
          여기에는 <b>DM 답장 승인용 봇</b>을 넣으세요. 댓글 알림 봇과는 <b>다른 봇</b>이어야 합니다(텔레그램 봇 하나에는 연결 주소를 하나만 걸 수 있어요).
          댓글용 봇은 「API키등록·플랫폼연동」의 텔레그램 칸에 넣습니다.
        </p>
        <p className="text-sm text-ig-muted">
          인스타그램 계정 연결이 끊어지면 매일 자동 점검 후 텔레그램으로 알려드려요. 또한 새 DM이
          들어와 AI 답장 초안이 만들어지면 원본 메시지와 초안을 함께 보내드리고, 텔레그램에서 바로{" "}
          <strong className="text-ig-text">✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</strong>를 선택할
          수 있어요. 다른 AIMaster 프로그램에서 이미 연동하셨어도 여기서는 별도로 연동해야 합니다.
        </p>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-ig-success">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={disconnectTelegramAction}>
                <button type="submit" className="rounded-lg bg-ig-danger/10 px-4 py-2 text-xs font-bold text-ig-danger hover:bg-ig-danger/15">
                  연동 해제
                </button>
              </form>
              <ReregisterWebhookButton />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-ig-muted">
              <li>
                텔레그램에서 <span className="font-semibold text-ig-text">@BotFather</span>를 검색해서 대화를 시작하세요.
              </li>
              <li>
                <code className="rounded bg-ig-raised px-1 py-0.5">/newbot</code> 명령을 보내고, 안내에 따라 봇 이름을 정하세요 (마지막엔
                반드시 <code className="rounded bg-ig-raised px-1 py-0.5">bot</code>으로 끝나야 해요).
              </li>
              <li>
                완료되면 BotFather가 <strong>토큰</strong>을 알려줘요. 그 값을 복사하세요.
              </li>
              <li>
                방금 만든 내 봇을 텔레그램에서 열고, <strong>아무 메시지나 1개</strong> 보내세요.
              </li>
              <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
            </ol>
            <TelegramConnectForm />
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <h2 className="text-lg font-bold text-ig-text">⚡ 자동 발송 (선택, 고급)</h2>
        <p className="text-sm text-ig-muted">
          기본적으로는 새 DM마다 AI 초안만 만들고, 실제 발송은 웹 화면이나 텔레그램 버튼에서 직접
          승인해야 합니다. 이 설정을 켜면 검토 없이 AI 초안이 바로 발송됩니다.
        </p>
        <AutoApproveSettingsForm enabled={settings?.auto_approve ?? false} />
      </section>

      <section className="space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <div>
          <h2 className="text-lg font-bold text-ig-text">📖 연동 매뉴얼</h2>
          <p className="text-sm text-ig-muted">
            이 프로그램에서 사용하는 API 키·플랫폼 연동 방법을 팝업창으로 열어 옆에 두고 그대로
            따라 할 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {GUIDE_LINKS.map((guide) => (
            <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
          ))}
        </div>
      </section>
    </div>
  );
}
