import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const PROVIDERS: ApiKeyProvider[] = ["serpapi", "openai"];

const HELP_LINKS: Partial<
  Record<ApiKeyProvider, { url: string; label: string; highlight?: string; description?: string }>
> = {
  serpapi: {
    url: "https://serpapi.com/manage-api-key",
    label: "SerpApi 키 발급받기 (serpapi.com)",
    highlight: "무료 플랜: 월 250회 검색 무료",
    description: "일 단위 한도는 따로 없음 · 250회 소진 후에는 유료 플랜 결제 필요",
  },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("user_telegram_links").select("bot_username").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          롱테일 키워드분석에는 본인의 SerpApi(구글/네이버 검색결과 조회)와 OpenAI(연관·롱테일
          키워드 추출, 작업 지시 생성) 키가 필요합니다.{" "}
          <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
          등록하지 않은 상태로 실행을 시도하면 등록 안내가 뜨고 막힙니다. SerpApi 키는 경쟁사
          키워드 분석 등 다른 AIMaster 프로그램에서 이미 등록하셨다면 여기서도 그대로 재사용됩니다
          — 다시 등록하실 필요 없습니다.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
              helpHighlight={HELP_LINKS[provider]?.highlight}
              helpDescription={HELP_LINKS[provider]?.description}
            />
          ))}
        </div>
      </section>

      <section className="glass-card space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">📨 텔레그램 알림 연동</h2>
        <p className="text-sm text-gray-500">
          키워드 확장이 끝나면 결과 요약을 텔레그램으로도 받아볼 수 있어요(선택 기능). 예약
          리마인드 등 다른 AIMaster 프로그램에서 이미 연동하셨다면 여기서도 그대로 재사용됩니다.
        </p>

        {telegramLink ? (
          <div className="space-y-3">
            <p className="text-sm text-green-600">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
            <form action={disconnectTelegramAction}>
              <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                연동 해제
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            <ol className="list-inside list-decimal space-y-2 text-sm text-gray-600">
              <li>
                텔레그램에서 <span className="font-semibold text-gray-900">@BotFather</span>를 검색해서 대화를 시작하세요.
              </li>
              <li>
                <code className="rounded bg-gray-100 px-1 py-0.5">/newbot</code> 명령을 보내고, 안내에 따라 봇 이름을 정하세요 (마지막엔
                반드시 <code className="rounded bg-gray-100 px-1 py-0.5">bot</code>으로 끝나야 해요).
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
    </div>
  );
}
