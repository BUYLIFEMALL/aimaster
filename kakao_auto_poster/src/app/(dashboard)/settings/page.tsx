import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { KakaoAccountSection } from "@/components/settings/KakaoAccountSection";
import { SmtpAccountSection } from "@/components/settings/SmtpAccountSection";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";
import { TelegramSection } from "@/components/settings/TelegramSection";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

const TELEGRAM_PROGRAM_SLUG = "kakao-auto-posting";

// 카카오 로그인("나에게 보내기") 연동에 필요한 회원 본인의 카카오 앱 자격증명 — 2026-09-16부터
// 앱(운영자) 공용 카카오 앱 대신 회원 각자 본인 앱을 등록하는 BYOK 방식으로 전환했다(카카오
// 앱이 "비즈니스 앱 전환" 심사를 받지 않은 동안은 테스터로 등록된 계정만 로그인이 가능해,
// 공용 앱 하나로는 운영자 본인 외 다른 회원이 연결할 수 없었기 때문 — threads의
// meta_app_id/meta_app_secret 전환과 동일한 이유).
const KAKAO_PROVIDERS: ApiKeyProvider[] = ["kakao_rest_api_key", "kakao_client_secret"];

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼에 해당하는
// 매뉴얼만 골랐다(naver-cafe-poster에서 만든 "연동 매뉴얼" 패턴을 전 서브프로젝트로 확장,
// 2026-09-13). 카카오 로그인("나에게 보내기")은 아직 매뉴얼이 없어 대상에서 뺐다.
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", label: "SOLAPI(카카오톡 알림톡/친구톡) API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
  { guideId: "1dbea19b-4c83-4453-ae41-0b59d7f27b5f", label: "네이버 메일(SMTP) 연동하기" },
];

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 성격별로 묶어서 어떤 키가 어떤 기능에 쓰이는지 한눈에 구분되도록 그룹핑한다
// (insta_auto_poster/settings/page.tsx와 동일 패턴).
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "🔍 뉴스/정보 검색 AI",
    description: "관심 주제와 관련된 최신 뉴스/정책/트렌드를 실시간으로 검색하는 데 쓰입니다. 필수입니다.",
    providers: ["perplexity"],
  },
  {
    title: "✍️ 콘텐츠 생성 AI",
    description: "검색된 정보를 카카오톡 발송용 요약과 웹 리포트 본문으로 정리하는 데 쓰입니다. 필수입니다.",
    providers: ["openai", "anthropic"],
  },
  {
    title: "🎨 이미지 생성 AI",
    description: "리포트를 생성할 때마다 주제에 맞는 대표 이미지를 함께 만드는 데 쓰입니다. 필수입니다.",
    providers: ["gemini"],
  },
];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ kakao_connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { kakao_connected, error } = await searchParams;

  const [{ data: keys }, { data: kakaoAccount }, { data: smtpAccount }, { data: solapiAccount }, { data: telegramLink }] =
    await Promise.all([
      supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
      supabase.from("user_kakao_accounts").select("nickname").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("user_smtp_accounts")
        // 다른 프로그램에서 이미 여러 개(예: Gmail+네이버) 등록해둔 경우를 대비해 배열로
        // 받는다 — .maybeSingle()은 행이 2개 이상이면 에러를 던진다.
        .select("id, smtp_host, smtp_port, smtp_user, from_name, is_active, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("user_solapi_accounts")
        .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id, channel_friend_url, alimtalk_template_id")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("user_telegram_links")
        .select("bot_username")
        .eq("user_id", user.id)
        .eq("program_slug", TELEGRAM_PROGRAM_SLUG)
        .maybeSingle(),
    ]);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-neutral-600">
        정보 콘텐츠 생성 기능 사용 전 본인의 API 키를 등록해야 합니다.
      </p>

      {kakao_connected && (
        <div className="mb-5 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-800">
          카카오 로그인이 성공적으로 연동되었습니다.
        </div>
      )}
      {error === "kakao_app_missing" && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          카카오 로그인으로 연동하려면 먼저 아래 &quot;💛 카카오 로그인으로 받기&quot; 섹션에서
          본인의 카카오 REST API 키를 등록해주세요.
        </div>
      )}
      {error && error !== "kakao_app_missing" && (
        <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          카카오 로그인 연동에 실패했습니다. 다시 시도해주세요.
        </div>
      )}

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
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

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-4 space-y-2 text-xs text-neutral-500">
            <p className="text-sm font-bold text-neutral-900">🔑 카카오 앱 등록 (카카오 로그인 연동용)</p>
            <p>
              카카오 로그인은 developers.kakao.com에서 <b>본인 명의로 카카오 앱을 직접 만들고</b>
              아래 REST API 키를 등록해야 연동할 수 있습니다(앱이 카카오의 &quot;비즈니스 앱
              전환&quot; 심사를 받지 않은 동안은, 그 앱의 &quot;앱 설정 &gt; 카카오 로그인 &gt;
              보안&quot; 또는 &quot;역할&quot; 메뉴에서 테스터로 등록된 계정만 로그인을 완료할 수
              있으니, 본인 카카오 계정도 함께 테스터로 추가해주세요).
            </p>
            <p>
              앱 생성 후 &quot;제품 설정 &gt; 카카오 로그인 &gt; Redirect URI&quot;에 아래 콜백
              주소를 등록하고, &quot;앱 설정 &gt; 앱 키&quot;에서 REST API 키를 복사해 아래에
              입력해주세요. Client Secret은 &quot;보안 &gt; Client Secret&quot;을 활성화한
              경우에만 필요합니다(활성화하지 않았다면 비워둬도 됩니다).
            </p>
            <code className="block break-all rounded bg-neutral-200 px-2 py-1.5 text-neutral-800">
              {process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakaoautoposter.vercel.app"}/api/kakao/callback
            </code>
          </div>

          <div className="mb-4 space-y-3">
            {KAKAO_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              />
            ))}
          </div>

          <KakaoAccountSection account={kakaoAccount ?? null} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <SolapiAccountSection account={solapiAccount ?? null} />
          <p className="mt-3 border-t border-neutral-200 pt-3 text-xs text-neutral-500">
            리포트를 함께 받아볼 사람들은{" "}
            <a href="/recipients" className="font-medium text-yellow-700 hover:underline">
              카카오톡 수신자 목록
            </a>{" "}
            메뉴에서 등록/관리합니다.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <SmtpAccountSection accounts={smtpAccount ?? []} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <TelegramSection link={telegramLink ?? null} />
        </div>

        <div className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-5 shadow-sm">
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
        </div>
      </div>
    </div>
  );
}
