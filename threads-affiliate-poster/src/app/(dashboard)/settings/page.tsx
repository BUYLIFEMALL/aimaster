import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "gemini"];
const COUPANG_PROVIDERS: ApiKeyProvider[] = ["coupang_access_key", "coupang_secret_key"];
const ALIEXPRESS_PROVIDERS: ApiKeyProvider[] = ["aliexpress_app_key", "aliexpress_app_secret"];

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
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API 키 설정</h1>
        <p className="text-sm text-neutral-600">
          게시글/이미지 생성이나 제휴 링크 생성 전 본인의 API 키를 먼저 등록해주세요. 안 쓰는
          플랫폼의 키는 등록하지 않아도 됩니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">🤖 캡션/이미지 생성 AI</h2>
        {AI_PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">🛒 쿠팡파트너스</h2>
        <p className="text-xs text-neutral-500">
          <a href="https://partners.coupang.com" target="_blank" rel="noreferrer" className="underline">
            partners.coupang.com
          </a>
          에서 API 신청 후 발급받은 Access Key/Secret Key를 등록해주세요.
        </p>
        {COUPANG_PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">🛍️ 알리익스프레스</h2>
        <p className="text-xs text-neutral-500">
          <a href="https://portals.aliexpress.com" target="_blank" rel="noreferrer" className="underline">
            portals.aliexpress.com
          </a>
          에서 Affiliate API 신청 후 발급받은 App Key/Secret을 등록해주세요.
        </p>
        {ALIEXPRESS_PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
          />
        ))}
      </section>

      <section className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">📎 네이버 브랜드커넥트</h2>
        <p className="text-xs text-neutral-500">
          네이버 브랜드커넥트는 공식 API가 없어 별도 키 등록이 필요 없습니다. &quot;상품
          관리&quot; 화면에서 직접 발급받은 링크를 붙여넣어 등록해주세요.
        </p>
      </section>
    </div>
  );
}
