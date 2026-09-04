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
const TOSS_PROVIDERS: ApiKeyProvider[] = ["toss_access_key", "toss_secret_key", "toss_publisher_id"];
// 토스 쉐어링크 API는 호출 서버의 고정 아웃바운드 IP를 미리 등록해야 발송을 허용한다.
// 회원마다 다른 IP가 아니라, 이 플랫폼(Vercel)이 고정 IP 프록시(Fixie)로 내보내는
// IP 2개를 모든 회원이 각자 본인 토스 어드민에 그대로 등록하면 된다.
const TOSS_FIXED_IPS = ["52.87.82.133", "52.5.155.132"];

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

      {/* 플랫폼/계열별로 그룹 박스를 나눠서 어떤 키가 어떤 기능에 쓰이는지 한눈에 구분되도록 한다.
          박스 배경(neutral-100)은 페이지 body(neutral-50)와 뚜렷이 대비되도록 하고, border-2 +
          shadow-sm으로 테두리를 확실히 보이게 한다. */}
      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-neutral-900">📈 네이버 검색어트렌드</h2>
        <p className="text-xs text-neutral-500">
          검색어트렌드는 회원 개인 데이터가 아니라 공개 시장 데이터라 별도 키 등록이 필요 없습니다.
          &quot;트렌드 키워드 찾기&quot; 메뉴에서 바로 조회할 수 있습니다.
        </p>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🧵 Threads 계정 연결</h2>
          <p className="text-xs text-neutral-500">
            게시글을 자동으로 게시할 Threads 계정을 연결합니다(OAuth).
          </p>
        </div>
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

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🤖 캡션/이미지 생성 AI</h2>
          <p className="text-xs text-neutral-500">
            게시글 캡션과 이미지(NanoBanana) 자동 생성에 쓰입니다. 둘 중 1개만 등록해도 됩니다.
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

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🛒 쿠팡파트너스</h2>
          <p className="text-xs text-neutral-500">
            <a href="https://partners.coupang.com" target="_blank" rel="noreferrer" className="underline">
              partners.coupang.com
            </a>
            에서 API 신청 후 발급받은 Access Key/Secret Key를 등록해주세요.
          </p>
        </div>
        <div className="space-y-3">
          {COUPANG_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🌏 알리익스프레스</h2>
          <p className="text-xs text-neutral-500">
            <a href="https://portals.aliexpress.com" target="_blank" rel="noreferrer" className="underline">
              portals.aliexpress.com
            </a>
            에서 Affiliate API 신청 후 발급받은 App Key/Secret을 등록해주세요.
          </p>
        </div>
        <div className="space-y-3">
          {ALIEXPRESS_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">💙 토스쇼핑 쉐어링크</h2>
          <p className="text-xs text-neutral-500">
            <a href="https://sharelink.toss.im" target="_blank" rel="noreferrer" className="underline">
              sharelink.toss.im
            </a>
            에서 크리에이터 신청 후, 관리자콘솔에서 발급받은 Access Key/Secret Key와 Publisher
            ID(발급 주체 UUID)를 등록해주세요.
          </p>
          <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-semibold">⚠️ 허용 IP 등록이 꼭 필요합니다</p>
            <p className="mt-1">
              토스 쉐어링크는 호출 서버의 고정 IP를 미리 등록해야 발급이 됩니다. 본인 토스
              어드민의 &quot;허용 IP&quot; 설정에 아래 IP 2개를 그대로 등록해주세요(이 두 IP는
              모든 회원이 동일하게 등록하는, 이 플랫폼이 사용하는 고정 IP입니다).
            </p>
            <ul className="mt-2 space-y-0.5 font-mono">
              {TOSS_FIXED_IPS.map((ip) => (
                <li key={ip}>{ip}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="space-y-3">
          {TOSS_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <h2 className="mb-1 text-sm font-bold text-neutral-900">📎 네이버 브랜드커넥트</h2>
        <p className="text-xs text-neutral-500">
          네이버 브랜드커넥트는 공식 API가 없어 별도 키 등록이 필요 없습니다. &quot;상품
          관리&quot; 화면에서 직접 발급받은 링크를 붙여넣어 등록해주세요.
        </p>
      </section>
    </div>
  );
}
