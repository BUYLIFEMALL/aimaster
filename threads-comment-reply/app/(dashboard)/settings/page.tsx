import { StudioHeader } from "@/components/ui/StudioHeader";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { ThreadsConnectSection } from "@/components/settings/ThreadsConnectSection";
import { ReplySettingsForm } from "@/components/settings/ReplySettingsForm";
import { MonitoringSettingsForm } from "@/components/settings/MonitoringSettingsForm";
import { AutoApproveSettingsForm } from "@/components/settings/AutoApproveSettingsForm";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { ReregisterWebhookButton } from "@/components/settings/ReregisterWebhookButton";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { getThreadsConnectionStatus } from "@/lib/actions/threads";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  getReplyModelProvider,
} from "@/lib/ai/models";
import type { ApiKeyProvider } from "@/types/database.types";
import { NEW_REDIRECT_URI, oldRedirectUri } from "@/lib/oauthRedirect";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { ThreadsMetaAddressSummary } from "@/components/settings/ThreadsMetaAddressSummary";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { SchedulerModePicker } from "@/components/settings/SchedulerModePicker";
import { SchedulePublishingControl } from "@/components/settings/SchedulePublishingControl";

export const dynamic = "force-dynamic";

const META_PROVIDERS: ApiKeyProvider[] = ["threads_app_id", "threads_app_secret"];
const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini"];

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼(자체 Meta
// 앱·OpenAI·Anthropic·Gemini·텔레그램 봇)에 해당하는 매뉴얼만 골랐다(2026-09-13).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "0f5cd337-1231-48c0-a9a1-63297686a97e", label: "쓰레드 댓글자동화 - 메타 앱 만들기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string }>> = {
  threads_app_id: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  threads_app_secret: { url: "https://developers.facebook.com/apps", label: "Meta App Dashboard에서 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic Claude 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Google Gemini 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, connectionStatus, { data: settings }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getThreadsConnectionStatus(supabase, user.id),
    supabase
      .from("th_settings")
      .select(
        "default_link, ai_instructions, tone_preset, reply_model, auto_approve, monitoring_enabled, monitoring_interval_minutes, monitoring_started_at, last_run_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "threads-comment-reply")
      .maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const scheduler = await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id);
  const activeModel = settings?.reply_model ?? DEFAULT_REPLY_MODEL;
  const activeModelOption = REPLY_MODEL_OPTIONS.find((o) => o.value === activeModel);
  const activeProvider = getReplyModelProvider(activeModel);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <StudioHeader
          icon="🔑"
          title="API키등록·플랫폼연동"
          description={'본인의 Threads 앱 ID / Threads 앱 시크릿 코드와, 답글 초안을 만드는 AI 키(아래 "답글 생성 AI 모델"에서 고른 모델의 키 하나)가 필요합니다. 앱(관리자) 공용 키로 대신 동작하지 않습니다.'}
        />

        <div className="space-y-5">
          {/* 제거·삭제 콜백은 threads-affiliate-poster가 이 프로그램 데이터(th_accounts/th_posts)까지 처리한다 */}
          <ThreadsMetaAddressSummary
            uninstallUrl="https://threads-affiliate-poster.buylife.xyz/api/threads/uninstall"
            deleteUrl="https://threads-affiliate-poster.buylife.xyz/api/threads/delete"
          />

          {/* 🧵 Threads 계정 연결 그룹 */}
          <div className="space-y-4 rounded-2xl border-2 border-th-border bg-th-surface p-4">
            <div>
              <h2 className="text-sm font-bold text-th-text">🧵 Threads 계정 연결</h2>
              <p className="text-xs text-th-muted">
                쓰레드 게시물·댓글을 읽고 답글을 게시하기 위한 Threads 앱 ID / Threads 앱 시크릿 코드 등록과 OAuth
                계정 연결입니다.
              </p>
            </div>

            <div className="space-y-2 text-xs text-th-muted">
              <p>
                Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
                등록해주셔야 합니다. 또한 그 앱의 "역할" 메뉴에서 본인 쓰레드 계정을
                테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
              </p>
              <p className="font-semibold text-th-text">아래 두 주소를 모두 등록해주세요(기존 주소는 곧 정리될 예정이라 새 주소도 꼭 추가).</p>
              <p>① 기존 주소</p>
              <CopyAddress value={oldRedirectUri()} />
              {oldRedirectUri() !== NEW_REDIRECT_URI && (
                <>
                  <p>② 새 주소</p>
                  <CopyAddress value={NEW_REDIRECT_URI} />
                  <p>새 주소를 등록한 뒤에는 아래 [새 주소로 연결] 버튼으로 연결해 보세요.</p>
                </>
              )}
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

            <ThreadsConnectSection
              connected={connectionStatus.connected}
              username={connectionStatus.username}
              needsReconnect={connectionStatus.needsReconnect}
              showNewCallback={oldRedirectUri() !== NEW_REDIRECT_URI}
            />
          </div>

          {/* 🤖 AI 답글 생성 키 그룹 */}
          <div className="space-y-4 rounded-2xl border-2 border-th-border bg-th-surface p-4">
            <div>
              <h2 className="text-sm font-bold text-th-text">🤖 AI 답글 생성 키</h2>
              <p className="text-xs text-th-muted">
                댓글에 대한 답글 초안을 만드는 AI 키입니다. OpenAI/Anthropic Claude/Google
                Gemini 중 "답글 생성 AI 모델"에서 고른 모델에 해당하는 provider의 키 하나만
                등록되어 있으면 됩니다(세 개 다 등록할 필요 없음).
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-th-link/30 bg-th-link/10 px-4 py-3 text-sm text-th-link">
              <p>
                🎯 현재 답글 생성에 사용되는 모델: <strong>{activeModelOption?.shortLabel ?? activeModel}</strong>
              </p>
              <p>
                사용하는 API 키: <strong>{REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]}</strong>
              </p>
              <p className="text-xs text-th-link">
                모델은 아래 "🔗 답글 기본 설정 → 답글 생성 AI 모델"에서 바꿀 수 있어요.
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
          </div>
        </div>
      </section>

      <section className="glass-card space-y-4 rounded-2xl border border-th-border bg-th-surface p-6">
        <h2 className="text-lg font-bold text-th-text">📨 텔레그램 알림 연동</h2>
        <p className="text-sm text-th-muted">
          쓰레드 계정 연결이 끊어지면 매일 자동 점검 후 텔레그램으로 알려드려요. 또한 새
          댓글이 들어와 AI 답글 초안이 만들어지면 원본 댓글과 초안을 함께 보내드리고,
          텔레그램에서 바로 <strong className="text-th-text">✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</strong>를
          선택할 수 있어요(선택 기능). "보류"를 누르면 웹의 "댓글 검토/게시" 화면에 남아있어 나중에
          수정 후 게시할 수 있습니다. 다른 AIMaster 프로그램에서 이미 연동하셨어도 여기서는 별도로
          연동해야 합니다.
        </p>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-th-success">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
            <div className="flex flex-wrap items-center gap-2">
              <form action={disconnectTelegramAction}>
                <button type="submit" className="rounded-lg bg-th-danger/10 px-4 py-2 text-xs font-bold text-th-danger hover:bg-th-danger/20">
                  연동 해제
                </button>
              </form>
              <ReregisterWebhookButton />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-th-muted">
              <li>
                텔레그램에서 <span className="font-semibold text-th-text">@BotFather</span>를 검색해서 대화를 시작하세요.
              </li>
              <li>
                <code className="rounded bg-th-raised px-1 py-0.5">/newbot</code> 명령을 보내고, 안내에 따라 봇 이름을 정하세요 (마지막엔
                반드시 <code className="rounded bg-th-raised px-1 py-0.5">bot</code>으로 끝나야 해요).
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

      <section className="glass-card space-y-3 rounded-2xl border border-th-border bg-th-surface p-6">
        <h2 className="text-lg font-bold text-th-text">🔗 답글 기본 설정</h2>
        <ReplySettingsForm
          defaultLink={settings?.default_link ?? null}
          aiInstructions={settings?.ai_instructions ?? null}
          tonePreset={settings?.tone_preset ?? null}
          replyModel={settings?.reply_model ?? null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-th-border bg-th-surface p-6">
        <h2 className="text-lg font-bold text-th-text">⏱ 예약 모니터링</h2>
        <SchedulePublishingControl initial={scheduler} />
        <MonitoringSettingsForm
          enabled={settings?.monitoring_enabled ?? false}
          intervalMinutes={settings?.monitoring_interval_minutes ?? 60}
          startedAt={settings?.monitoring_started_at ?? null}
          lastRunAt={settings?.last_run_at ?? null}
        />
      </section>

      {/* ⏰ 댓글 모니터링 실행 방식(v1.26, 지침 docs/SCHEDULER_POLICY.md) — 모니터링 시작/중지는 위 「예약 모니터링」에서 한다 */}
      <section id="scheduler-mode" className="glass-card space-y-3 rounded-2xl border border-th-border bg-th-surface p-6">
        <h2 className="text-lg font-bold text-th-text">⏰ 예약 실행 방식</h2>
        <p className="text-sm text-th-muted">
          예약 모니터링을 무엇으로 돌릴지 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고,
          본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요.
        </p>
        <SchedulerModePicker initialMode={scheduler.mode} platformAvailable={scheduler.platformAvailable} hasKey={scheduler.hasKey} />
        <p className="text-xs font-semibold text-th-text">cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)</p>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-th-muted">
          <li><a className="font-semibold text-th-link underline" href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org</a> 무료 가입 → 이메일 인증 → 로그인</li>
          <li>콘솔 <strong>Settings → API</strong> → <strong>Create API key</strong> → 키 복사 (<strong>IP 제한은 켜지 마세요</strong>)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        <ApiKeyRow
          provider="cronjob_org_api_key"
          label={PROVIDER_LABELS.cronjob_org_api_key}
          maskedValue={keyMap.has("cronjob_org_api_key") ? maskApiKey(keyMap.get("cronjob_org_api_key")!) : null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-th-border bg-th-surface p-6">
        <h2 className="text-lg font-bold text-th-text">⚡ 자동 게시 (선택, 고급)</h2>
        <p className="text-sm text-th-muted">
          기본적으로는 새 댓글마다 AI 초안만 만들고, 실제 게시는 웹 화면이나 텔레그램 버튼에서
          직접 승인해야 합니다. 이 설정을 켜면 검토 없이 AI 초안이 바로 게시됩니다.
        </p>
        <AutoApproveSettingsForm enabled={settings?.auto_approve ?? false} />
      </section>

      <section className="rounded-2xl border-2 border-th-border bg-th-raised p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-th-text">📖 연동 매뉴얼</h2>
          <p className="text-xs text-th-muted">
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
