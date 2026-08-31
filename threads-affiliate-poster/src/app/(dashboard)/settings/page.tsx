import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { Button } from "@/components/ui/Button";
import { connectThreadsAccountAction, disconnectThreadsAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";

const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "gemini"];
const COUPANG_PROVIDERS: ApiKeyProvider[] = ["coupang_access_key", "coupang_secret_key"];
const ALIEXPRESS_PROVIDERS: ApiKeyProvider[] = [
  "aliexpress_app_key",
  "aliexpress_app_secret",
  "aliexpress_tracking_id",
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error } = await searchParams;

  const [{ data: keys }, { data: account }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("tap_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키 설정 및 연결</h1>
        <p className="text-sm text-neutral-600">
          게시글/이미지 생성이나 제휴 링크 생성 전 본인의 API 키를 먼저 등록해주세요. 안 쓰는
          플랫폼의 키는 등록하지 않아도 됩니다.
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Threads 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Threads 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-neutral-900">🧵 Threads 계정 연결</h2>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          {account ? (
            <div>
              <p className="text-sm text-neutral-500">연결된 계정</p>
              <p className="mt-1 text-lg font-medium text-neutral-900">
                @{account.username ?? account.threads_user_id}
              </p>
              {account.token_expires_at && (
                <p className="mt-1 text-xs text-neutral-500">
                  토큰 만료: {new Date(account.token_expires_at).toLocaleString("ko-KR")}
                </p>
              )}
              <form action={disconnectThreadsAccountAction} className="mt-4">
                <Button type="submit" variant="danger">
                  연결 해제
                </Button>
              </form>
            </div>
          ) : (
            <div>
              <p className="mb-4 text-sm text-neutral-600">
                게시글을 자동으로 게시하려면 먼저 Threads 계정을 연결해야 합니다. 기존
                &quot;Threads 포스팅 자동화(threads)&quot; 프로그램과 같은 Meta 앱을 재사용하므로
                별도로 새 앱을 만들 필요는 없습니다.
              </p>
              <form action={connectThreadsAccountAction}>
                <Button type="submit">Threads 계정 연결하기</Button>
              </form>
            </div>
          )}
        </div>
      </section>

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
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">📈 네이버 검색어트렌드</h2>
        <p className="text-xs text-neutral-500">
          검색어트렌드는 회원 개인 데이터가 아니라 공개 시장 데이터라 별도 키 등록이 필요 없습니다.
          &quot;트렌드 키워드 찾기&quot; 메뉴에서 바로 조회할 수 있습니다.
        </p>
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
