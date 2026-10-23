import { StudioHeader } from "@/components/ui/StudioHeader";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { InstagramConnectSection } from "@/components/settings/InstagramConnectSection";
import { ReplySettingsForm } from "@/components/settings/ReplySettingsForm";
import { MonitoringSettingsForm } from "@/components/settings/MonitoringSettingsForm";
import { AutoApproveSettingsForm } from "@/components/settings/AutoApproveSettingsForm";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { ReregisterWebhookButton } from "@/components/settings/ReregisterWebhookButton";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { getInstagramConnectionStatus } from "@/lib/actions/instagram";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import {
  REPLY_MODEL_OPTIONS,
  DEFAULT_REPLY_MODEL,
  REPLY_MODEL_PROVIDER_SHORT_LABELS,
  getReplyModelProvider,
} from "@/lib/ai/models";
import type { ApiKeyProvider } from "@/types/database.types";
import { CopyAddress } from "@/components/settings/CopyAddress";
import { InstagramMetaAddressSummary } from "@/components/settings/InstagramMetaAddressSummary";
import { INSTAGRAM_REDIRECT_NEW, INSTAGRAM_REDIRECT_OLD, SITE_ORIGIN } from "@/lib/oauthRedirect";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { SchedulerModePicker } from "@/components/settings/SchedulerModePicker";
import { SchedulePublishingControl } from "@/components/settings/SchedulePublishingControl";

export const dynamic = "force-dynamic";

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];
const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini"];

// platform_guides.id — 이 프로그램이 실제로 쓰는 Meta 앱(댓글·DM 자동화)/AI/텔레그램에
// 해당하는 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "4115e455-1585-4304-89b4-d29859fd7a5a", label: "인스타그램 계정 연동하기 (댓글·DM 자동화)" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
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

  // 2026-10-20 병합 B: DM 계정(dm_accounts) 연결 여부 — 연결 화면에 「(댓글·DM)」 표시·DM 권한 추가 버튼
  const { data: dmAccount } = await supabase.from("dm_accounts").select("user_id").eq("user_id", user.id).maybeSingle();
  const [{ data: keys }, connectionStatus, { data: settings }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    getInstagramConnectionStatus(supabase, user.id),
    supabase
      .from("ig_settings")
      .select(
        "default_link, ai_instructions, tone_preset, reply_model, auto_approve, monitoring_enabled, monitoring_interval_minutes, monitoring_started_at, last_run_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "instagram-comment-reply")
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
          description="INSTA 댓글·DM 자동화는 본인의 Meta 앱(인스타그램 연동)과 AI 키(답글 생성)를 각각 연동해서 사용합니다. 앱(관리자) 공용 키로 대신 동작하지 않습니다."
        />

        <div className="space-y-5">
          <InstagramMetaAddressSummary webhookUrl={`${SITE_ORIGIN}/api/instagram/dm-webhook/${user.id}`} />

          {/* 📸 Instagram 계정 연결 그룹 */}
          <div className="space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-ig-text">📸 Instagram 계정 연결</h2>
              <p className="text-xs text-ig-muted">
                인스타그램 게시물·댓글을 읽고 답글을 게시하기 위한 Instagram 앱 ID / Instagram 앱 시크릿 코드 등록과
                OAuth 계정 연결입니다.
              </p>
            </div>

            <div className="space-y-2 text-xs text-ig-muted">
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

            <InstagramConnectSection
              showNewCallback={INSTAGRAM_REDIRECT_OLD() !== INSTAGRAM_REDIRECT_NEW}
              connected={connectionStatus.connected}
              username={connectionStatus.username}
              needsReconnect={connectionStatus.needsReconnect}
              dmConnected={Boolean(dmAccount)}
            />
          </div>

          {/* 🤖 AI 답글 생성 키 그룹 */}
          <div className="space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-4 shadow-sm">
            <div>
              <h2 className="text-sm font-bold text-ig-text">🤖 AI 답글 생성 키</h2>
              <p className="text-xs text-ig-muted">
                댓글에 대한 답글 초안을 만드는 AI 키입니다. OpenAI/Anthropic Claude/Google
                Gemini 중 "답글 생성 AI 모델"에서 고른 모델에 해당하는 provider의 키 하나만
                등록되어 있으면 됩니다(세 개 다 등록할 필요 없음).
              </p>
            </div>

            <div className="space-y-1 rounded-xl border border-ig-primary/30 bg-ig-primary/10 px-4 py-3 text-sm text-ig-primary">
              <p>
                🎯 현재 답글 생성에 사용되는 모델: <strong>{activeModelOption?.shortLabel ?? activeModel}</strong>
              </p>
              <p>
                사용하는 API 키: <strong>{REPLY_MODEL_PROVIDER_SHORT_LABELS[activeProvider]}</strong>
              </p>
              <p className="text-xs text-ig-primary">
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

      <section className="glass-card space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ig-text">📨 텔레그램 알림 연동 <span className="ml-1 rounded-full bg-sky-500/15 px-2 py-0.5 align-middle text-xs font-bold text-sky-300">💬 댓글 전용 봇</span></h2>
        <p className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-ig-text">
          여기에는 <b>댓글 답글 승인용 봇</b>을 넣으세요. DM 답장 승인용 봇은 「💬 DM 답변 → DM 답변 설정」에 <b>다른 봇</b>으로 따로 넣습니다.
        </p>
        <p className="text-sm text-ig-muted">
          인스타그램 계정 연결이 끊어지면 매일 자동 점검 후 텔레그램으로 알려드려요. 또한 새
          댓글이 들어와 AI 답글 초안이 만들어지면 원본 댓글과 초안을 함께 보내드리고,
          텔레그램에서 바로 <strong className="text-ig-text">✅ 답변승인 / ⏸ 답변보류 / ❌ 답변제외</strong>를
          선택할 수 있어요(선택 기능). "보류"를 누르면 웹의 "댓글 검토/게시" 화면에 남아있어 나중에
          수정 후 게시할 수 있습니다. 다른 AIMaster 프로그램에서 이미 연동하셨어도 여기서는 별도로
          연동해야 합니다.
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

      <section className="glass-card space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ig-text">🔗 답글 기본 설정</h2>
        <ReplySettingsForm
          defaultLink={settings?.default_link ?? null}
          aiInstructions={settings?.ai_instructions ?? null}
          tonePreset={settings?.tone_preset ?? null}
          replyModel={settings?.reply_model ?? null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ig-text">⏱ 예약 모니터링</h2>
        <SchedulePublishingControl initial={scheduler} />
        <MonitoringSettingsForm
          enabled={settings?.monitoring_enabled ?? false}
          intervalMinutes={settings?.monitoring_interval_minutes ?? 60}
          startedAt={settings?.monitoring_started_at ?? null}
          lastRunAt={settings?.last_run_at ?? null}
        />
      </section>

      {/* ⏰ 댓글 모니터링 실행 방식(v1.36, 지침 docs/SCHEDULER_POLICY.md) — 모니터링 시작/중지는 위 「예약 모니터링」에서 한다 */}
      <section id="scheduler-mode" className="glass-card space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ig-text">⏰ 예약 실행 방식</h2>
        <p className="text-sm text-ig-muted">
          예약 모니터링을 무엇으로 돌릴지 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고,
          본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요.
        </p>
        <SchedulerModePicker initialMode={scheduler.mode} platformAvailable={scheduler.platformAvailable} hasKey={scheduler.hasKey} />
        <p className="text-xs font-semibold text-ig-text">cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)</p>
        <ol className="list-decimal space-y-1 pl-4 text-xs text-ig-muted">
          <li><a className="font-semibold text-ig-link underline" href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org</a> 무료 가입 → 이메일 인증 → 로그인</li>
          <li>콘솔 <strong>Settings → API</strong> → <strong>Create API key</strong> → 키 복사 (<strong>IP 제한은 켜지 마세요</strong>)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        <ApiKeyRow
          provider="cronjob_org_api_key"
          label={PROVIDER_LABELS.cronjob_org_api_key}
          maskedValue={keyMap.has("cronjob_org_api_key") ? maskApiKey(keyMap.get("cronjob_org_api_key")!) : null}
        />
      </section>

      <section className="glass-card space-y-3 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
        <h2 className="text-lg font-bold text-ig-text">⚡ 자동 게시 (선택, 고급)</h2>
        <p className="text-sm text-ig-muted">
          기본적으로는 새 댓글마다 AI 초안만 만들고, 실제 게시는 웹 화면이나 텔레그램 버튼에서
          직접 승인해야 합니다. 이 설정을 켜면 검토 없이 AI 초안이 바로 게시됩니다.
        </p>
        <AutoApproveSettingsForm enabled={settings?.auto_approve ?? false} />
      </section>

      <section className="glass-card space-y-4 rounded-2xl border border-ig-border bg-ig-surface p-6 shadow-sm">
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
