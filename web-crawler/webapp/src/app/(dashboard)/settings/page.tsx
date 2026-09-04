import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini", "perplexity"];

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키 설정</h1>
        <p className="text-sm text-neutral-600">
          크롤링한 페이지에서 원하는 항목을 추출·분석하려면 본인의 OpenAI·Anthropic·Gemini·
          Perplexity API 키 중 최소 1개를 먼저 등록해주세요.
        </p>
      </div>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🤖 크롤링 항목 분석 AI</h2>
          <p className="text-xs text-neutral-500">
            등록한 항목(예: 상품명, 가격, 평점)을 페이지에서 찾아 정리하는 데 쓰입니다.
          </p>
        </div>
        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
