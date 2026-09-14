import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { Button } from "@/components/ui/Button";
import { connectInstagramAccountAction, disconnectInstagramAccountAction } from "@/lib/actions/accounts";
import type { ApiKeyProvider } from "@/types/database.types";

const AUTH_METHOD_LABELS: Record<string, string> = {
  facebook_login: "Facebook 계정 연동",
  instagram_login: "API 키 등록 및 연동",
};

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// platform_guides.id — 이 페이지가 실제로 등록받는 API 키(OpenAI/Claude/Gemini/Perplexity)에
// 해당하는 매뉴얼만 골랐다(2026-09-13, 플랫폼 표준 "API키등록·플랫폼연동 페이지" 규칙). Meta
// App(Instagram) 연동은 아직 "피드 포스팅" 전용 가이드가 없어(기존 SNS 카테고리 가이드는
// "댓글·DM 자동화" 대상이라 딱 맞지 않음) 대상에서 뺐다 — 필요 시 별도로 추가할 것.
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
];

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];

// 성격별로 묶어서 어떤 키가 어떤 기능에 쓰이는지 한눈에 구분되도록 그룹핑한다.
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "✍️ 캡션/문구 생성 AI",
    description: "게시글 캡션·해시태그 생성에 쓰입니다. 둘 중 1개만 등록해도 됩니다.",
    providers: ["openai", "anthropic"],
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "카드뉴스·피드 이미지 생성 전용입니다.",
    providers: ["gemini"],
  },
  {
    title: "🔍 주제 수집 AI",
    description: "실시간 트렌드 기반 게시글 주제 수집 전용입니다.",
    providers: ["perplexity"],
  },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string; reason?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { connected, error, reason } = await searchParams;

  const [{ data: keys }, { data: account }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase.from("insta_accounts").select("*").eq("user_id", user.id).maybeSingle(),
  ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  const hasMetaKeys = keyMap.has("meta_app_id") && keyMap.has("meta_app_secret");

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API키등록·플랫폼연동</h1>
      <p className="mb-6 text-sm text-neutral-600">
        캡션/이미지 AI 생성 기능 사용전 본인의 API 키를 등록해야 하고, 게시글을 자동으로 게시하려면
        인스타그램 계정도 연결해야 합니다.
      </p>

      {connected && (
        <div className="mb-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          인스타그램 계정이 성공적으로 연결되었습니다.
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>인스타그램 계정 연결에 실패했습니다.</p>
          {reason && <p className="mt-1 font-medium">사유: {reason}</p>}
        </div>
      )}

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm"
          >
            <div className="mb-3">
              <h2 className="text-sm font-bold text-neutral-900">{section.title}</h2>
              <p className="text-xs text-neutral-500">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.providers.map((provider) => (
                <ApiKeyRow
                  key={provider}
                  provider={provider}
                  label={PROVIDER_LABELS[provider]}
                  maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                />
              ))}
            </div>
          </div>
        ))}

        {/* 🔑 API 키 등록 및 연동 그룹 (Instagram Login, BYOK 방식 — 대체/fallback 연결 방법) */}
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">🔑 API 키 등록 및 연동</h2>
            <p className="text-xs text-neutral-500">
              아래 &quot;연동 계정&quot;의 기본(Facebook) 방식으로 연결이 안 될 때 쓰는 대체 연결
              방법입니다. 본인 소유의 Meta 앱 App ID/Secret을 등록한 뒤, 아래 &quot;API 키 방식으로
              연결하기&quot;를 눌러주세요.
            </p>
          </div>

          <div className="mb-3 space-y-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
            <p>
              Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
              등록해주셔야 합니다. 또한 그 앱의 &quot;역할&quot; 메뉴에서 본인 인스타그램 계정을
              테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
            </p>
            <code className="block break-all rounded bg-neutral-100 px-2 py-1.5 text-neutral-800">
              {process.env.NEXT_PUBLIC_SITE_URL ?? "https://insta-auto-poster.vercel.app"}/api/instagram/callback/byok
            </code>
            <p>인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
          </div>

          <div className="space-y-3">
            {META_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                helpUrl="https://developers.facebook.com/apps"
                helpLabel="Meta App Dashboard에서 발급받기"
              />
            ))}
          </div>
        </div>

        {/* 📷 연동 계정 그룹 (기존 별도 /accounts 페이지를 여기로 병합, 2026-09-14) */}
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">📷 연동 계정</h2>
            <p className="text-xs text-neutral-500">
              인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).
            </p>
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
            {account ? (
              <div>
                <p className="text-sm text-neutral-500">연결된 계정</p>
                <p className="mt-1 text-lg font-medium text-neutral-900">
                  @{account.ig_username ?? account.ig_user_id}
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  연결 방식: {AUTH_METHOD_LABELS[account.auth_method] ?? account.auth_method}
                </p>
                {account.token_expires_at && (
                  <p className="mt-1 text-xs text-neutral-500">
                    토큰 만료: {new Date(account.token_expires_at).toLocaleString("ko-KR")}
                  </p>
                )}
                <form action={disconnectInstagramAccountAction} className="mt-4">
                  <Button type="submit" variant="danger">
                    연결 해제
                  </Button>
                </form>
              </div>
            ) : (
              <div>
                <p className="mb-4 text-sm text-neutral-600">
                  게시글을 자동으로 게시하려면 먼저 인스타그램 계정을 연결해야 합니다. 별도 설정 없이
                  바로 아래 버튼으로 연결해보세요.
                </p>
                <form action={connectInstagramAccountAction}>
                  <input type="hidden" name="method" value="facebook_login" />
                  <Button type="submit">인스타그램 계정 연결하기</Button>
                </form>

                <div className="mt-5 border-t border-neutral-200 pt-4">
                  <p className="text-xs text-neutral-500">
                    위 방법으로 연결이 안 되시나요? 바로 위 &quot;API 키 등록 및 연동&quot;에서 본인
                    소유의 Meta 앱(API 키)을 등록하면 대신 연결할 수 있습니다.
                  </p>
                  {hasMetaKeys && (
                    <form action={connectInstagramAccountAction} className="mt-3">
                      <input type="hidden" name="method" value="instagram_login" />
                      <Button type="submit" variant="secondary">
                        API 키 방식으로 연결하기
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
            <p className="text-xs text-neutral-500">
              이 프로그램에서 사용하는 API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라
              할 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GUIDE_LINKS.map((guide) => (
              <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
