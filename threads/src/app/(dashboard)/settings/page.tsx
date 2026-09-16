import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { Button } from "@/components/ui/Button";
import { connectThreadsAccountAction, disconnectThreadsAccountAction } from "@/lib/actions/accounts";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini", "perplexity"];
const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼에 해당하는
// 매뉴얼만 골랐다(2026-09-13, naver-cafe-poster에서 시작된 플랫폼 표준을 그대로 적용).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "343996d3-8c77-455d-9bd4-54bcd47a34cd", label: "쓰레드(Threads) 계정 연동하기" },
];

// threads-affiliate-poster의 /settings와 동일하게, "API키등록"과 "플랫폼연동"(Threads 계정
// 연결)을 별도 메뉴/페이지로 나누지 않고 한 화면에 섹션 블록으로 합쳤다 — 사이드바 메뉴도
// "API키등록·플랫폼연동" 하나로 합치면서 기존 /accounts 페이지를 여기로 흡수했다(2026-09-12).
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
    supabase.from("threads_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키등록·플랫폼연동</h1>
        <p className="text-sm text-neutral-600">
          게시글/이미지 생성요청 전 본인의 API키를 등록하고, 게시글을 올릴 Threads 계정을
          연결해주세요.
        </p>
      </div>

      {connected && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          Threads 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error === "meta_app_missing" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          설정 페이지에서 본인의 Meta App ID/Secret을 먼저 등록해주세요.
        </div>
      )}
      {error && error !== "meta_app_missing" && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Threads 계정 연결에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-neutral-900">🤖 콘텐츠 생성 AI 키</h2>
          <p className="text-xs text-neutral-500">게시글 작성, 카드뉴스 이미지 생성, 실시간 주제 수집에 쓰이는 AI 키입니다</p>
        </div>
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

      <section className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🧵 Threads 계정 연결</h2>
          <p className="text-xs text-neutral-500">게시글을 자동으로 게시할 Threads 계정을 연결합니다(OAuth).</p>
        </div>

        <div className="mb-4 space-y-2 text-xs text-neutral-500">
          <p>
            Meta 앱이 아직 개발(Development) 모드이기 때문에, 그 앱의 &quot;역할&quot; 메뉴에서
            테스터(tester)로 등록된 계정만 연결이 됩니다. 본인 명의로 Meta 앱을 직접 만들고
            아래 두 값(Meta App ID/Secret)을 등록한 뒤, 그 앱의 유효한 OAuth 리디렉션 URI에
            아래 콜백 주소를 추가하고, &quot;역할&quot; 메뉴에서 본인 쓰레드 계정을 테스터로
            추가해주셔야 연결할 수 있습니다.
          </p>
          <code className="block break-all rounded bg-neutral-200 px-2 py-1.5 text-neutral-800">
            {process.env.NEXT_PUBLIC_SITE_URL ?? "https://threads.vercel.app"}/api/threads/callback
          </code>
        </div>

        <div className="mb-4 space-y-3">
          {META_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
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
                게시글을 자동으로 게시하려면 먼저 Threads 계정을 연결해야 합니다.
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
          <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
          <p className="text-xs text-neutral-500">
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
