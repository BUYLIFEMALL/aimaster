import { StudioHeader } from "@/components/dm/ui/StudioHeader";
import { requireProgramAccess } from "@/lib/dmApp/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/dm/settings/ApiKeyRow";
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
import type { ApiKeyProvider } from "@/types/database.types";
import { CopyAddress } from "@/components/dm/settings/CopyAddress";
import { InstagramMetaAddressSummary } from "@/components/dm/settings/InstagramMetaAddressSummary";
import { INSTAGRAM_REDIRECT_NEW, INSTAGRAM_REDIRECT_OLD, SITE_ORIGIN } from "@/lib/dmApp/oauthRedirect";

export const dynamic = "force-dynamic";

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];
const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini"];

// platform_guides.id — 이 프로그램이 실제로 쓰는 Meta 앱(댓글·DM 자동화)/AI/텔레그램에
// 해당하는 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "4115e455-1585-4304-89b4-d29859fd7a5a", label: "인스타그램 계정 연동하기 (댓글·DM 자동화)" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string }>> = {
  meta_app_id: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  meta_app_secret: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic Claude 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Google Gemini 키 발급받기" },
};

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
        icon="🔑"
        title="API키등록·플랫폼연동"
        description="인스타그램 계정 연결과 답장 생성 AI는 서로 다른 키를 씁니다 — 아래에서 순서대로 등록해주세요. 모두 회원님 본인 키만 쓰며, 앱(관리자) 공용 키로 대신 동작하지 않습니다."
      />

      <InstagramMetaAddressSummary webhookUrl={webhookCallbackUrl} />

      <section className="space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6">
        <div>
          <h2 className="text-lg font-bold text-ig-text">📸 Instagram 계정 연결</h2>
          <p className="text-xs text-ig-muted">Meta App 키 등록과 OAuth 연결까지 — 인스타그램 비즈니스 계정을 이 프로그램에 붙이는 단계입니다.</p>
        </div>
        <div className="space-y-2 text-sm text-ig-muted">
          <p>INSTA 댓글·DM 자동화에는 본인의 Instagram 앱 ID / Instagram 앱 시크릿 코드가 필요합니다.</p>
          <p className="font-semibold text-ig-text">앱(관리자) 공용 키로 대신 동작하지 않습니다.</p>
          <p>
            Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
            등록해주셔야 합니다. 또한 그 앱의 "역할" 메뉴에서 본인 인스타그램 계정을
            테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
          </p>
          <p className="font-semibold text-ig-text">아래 두 주소를 모두 등록해주세요(기존 주소는 곧 정리될 예정이라 새 주소도 꼭 추가).</p>
          <p>① 기존 주소</p>
          <CopyAddress value={INSTAGRAM_REDIRECT_OLD()} />
          {INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW && (
            <>
              <p>② 새 주소</p>
              <CopyAddress value={INSTAGRAM_REDIRECT_NEW} />
              <p>새 주소를 등록한 뒤에는 아래 [새 주소로 연결] 버튼으로 연결해 보세요.</p>
            </>
          )}
          <p>인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
        </div>

        {/* 2026-10-16: 시험 계정에서 Facebook 앱 ID를 넣어 Instagram 로그인이 "Invalid platform app"로 실패한 사례 — 값 위치 안내 */}

        <div className="space-y-2 rounded-lg border border-ig-warn/40 bg-ig-warn/10 px-4 py-3 text-sm leading-relaxed text-ig-warn">

          <p className="font-semibold">⚠️ &quot;Instagram 앱 ID&quot;는 앱 화면 맨 위의 &quot;앱 ID&quot;(Facebook 앱 ID)와 다른 값입니다.</p>

          <p>Meta 앱 대시보드 › <b>이용 사례</b> › <b>맞춤 설정</b> › (Instagram API) › <b>Instagram 로그인이 포함된 API 설정</b> 화면 맨 위의 <b>Instagram 앱 ID</b>와 <b>Instagram 앱 시크릿 코드</b>(표시 버튼)를 넣어주세요.</p><p>새 콜백 주소는 같은 화면의 &quot;4. Instagram 비즈니스 로그인 설정&quot;에 추가합니다.</p><p>맨 위 앱 ID를 넣으면 연결할 때 Instagram 화면에 &quot;Invalid platform app&quot; 오류가 납니다.</p>

        </div>

        <div className="space-y-3">
          {META_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
            />
          ))}
        </div>

        <div className="border-t border-ig-border pt-4">
          {/* 2026-10-20 병합 B: 인스타 연결은 「API키등록·플랫폼연동」에서 한 번(「DM 답변도 사용」 체크) — 댓글·DM 함께 */}
          <div className="space-y-2 text-sm">
            <p className={connectionStatus.connected && !connectionStatus.needsReconnect ? "text-ig-success" : "text-ig-muted"}>
              {connectionStatus.connected && !connectionStatus.needsReconnect
                ? `✅ DM 답변용으로 @${connectionStatus.username ?? "내 계정"} 연결됨`
                : connectionStatus.needsReconnect
                  ? "⚠️ 인스타그램 연결이 만료되었습니다. 다시 연결해 주세요."
                  : "DM 답변용 인스타그램 연결이 아직 없습니다."}
            </p>
            <a href="/settings" className="inline-block rounded-lg bg-ig-primary px-4 py-2 text-xs font-bold text-white hover:bg-ig-primary-hover">
              「API키등록·플랫폼연동」에서 연결하기 (「DM 답변도 사용」 체크)
            </a>
          </div>
        </div>
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
        <div>
          <h2 className="text-lg font-bold text-ig-text">🤖 AI 답장 생성 키</h2>
          <p className="text-xs text-ig-muted">답장 초안을 만드는 AI 모델의 API 키 등록입니다 — 인스타그램 연결과는 별개의 키입니다.</p>
        </div>
        <p className="text-sm text-ig-muted">
          아래 "답장 기본 설정"에서 고른 모델의 provider 키 하나만 등록되어 있으면 됩니다(세 개 다
          등록할 필요 없음).
        </p>

        <div className="space-y-1 rounded-xl border border-ig-primary/30 bg-ig-primary/10 px-4 py-3 text-sm text-ig-primary">
          <p>
            🎯 현재 답장 생성에 사용되는 모델: <strong>{activeModelOption?.shortLabel ?? activeModel}</strong>
          </p>
          <p>
            사용하는 API 키: <strong>{REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]}</strong>
          </p>
        </div>

        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
              isActive={provider === activeProvider}
            />
          ))}
        </div>
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
        <h2 className="text-lg font-bold text-ig-text">📨 텔레그램 알림 연동 <span className="ml-1 rounded-full bg-pink-500/15 px-2 py-0.5 align-middle text-xs font-bold text-pink-500">💌 DM 전용 봇</span></h2>
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
