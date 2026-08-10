import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/Button";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { ModelPreferenceForm } from "@/components/settings/ModelPreferenceForm";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";
import type { AnalysisModel } from "@/lib/ai/models";

const PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: telegramLink }, { data: apiKeys }, { data: preference }] = await Promise.all([
    supabase
      .from("user_telegram_links")
      .select("bot_username, chat_id, linked_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase
      .from("real_estate_user_preferences")
      .select("preferred_model")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const keyMap = new Map((apiKeys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="gold-text mb-2 text-2xl font-semibold">설정</h1>
        <p className="text-sm text-neutral-400">
          이 서비스는 각 사용자가 자신의 API 키와 텔레그램 봇을 직접 등록해서 사용해요.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium text-neutral-100">API 키</h2>
        <p className="mb-3 text-sm text-neutral-400">
          AI 분석(투자 매력도 분석)에 사용돼요. 등록하지 않으면 분석 기능을 쓸 수 없어요.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-neutral-100">AI 분석 모델</h2>
        <p className="mb-3 text-sm text-neutral-400">
          여기서 고른 모델로, 새 매물을 열어볼 때 매번 누르지 않아도 자동으로 투자 분석이
          되어 바로 보여요.
        </p>
        <ModelPreferenceForm currentModel={(preference?.preferred_model as AnalysisModel) ?? null} />
      </section>

      <section className="glass-card p-5">
        <h2 className="mb-3 text-lg font-medium text-neutral-100">텔레그램 알림 연동</h2>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-green-400">
              ✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.
            </p>
            <form action={disconnectTelegramAction}>
              <Button type="submit" variant="danger">
                연동 해제
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-neutral-300">
              <li>
                텔레그램에서 <span className="text-gold-light">@BotFather</span>를 검색해서 대화를
                시작하세요.
              </li>
              <li>
                <code className="rounded bg-dark-100 px-1 py-0.5">/newbot</code> 명령을 보내고,
                안내에 따라 봇 이름을 정하세요 (마지막엔 반드시 <code className="rounded bg-dark-100 px-1 py-0.5">bot</code>으로
                끝나야 해요, 예: <code className="rounded bg-dark-100 px-1 py-0.5">my_realestate_bot</code>).
              </li>
              <li>
                완료되면 BotFather가 <strong>토큰</strong>(숫자:영문조합 문자열)을 알려줘요. 그
                값을 복사하세요.
              </li>
              <li>
                방금 만든 내 봇을 텔레그램에서 열고, <strong>아무 메시지나 1개</strong> 보내세요
                (예: &quot;안녕&quot;).
              </li>
              <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
            </ol>
            <TelegramConnectForm />
          </div>
        )}
      </section>
    </div>
  );
}
