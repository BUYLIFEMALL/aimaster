import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { ProviderAccountSection } from "@/components/settings/ProviderAccountSection";
import type { SmtpAccountData } from "@/components/settings/SmtpAccountCard";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { SMTP_PROVIDER_PRESETS } from "@/lib/constants";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 프로바이더를 성격별 섹션으로 묶어서 보여준다 — 어떤 키가 어떤 기능에 쓰이는지
// 한눈에 구분되도록(예: 네이버 관련 3그룹, 알리/도매매/유튜브 각 1그룹, AI 1그룹).
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "☁️ 네이버클라우드 API HUB",
    description: "쇼핑인사이트 관심도 추이 조회 — 기회 점수 계산의 기본 데이터",
    providers: ["naver_client_id", "naver_client_secret"],
  },
  {
    title: "🔍 네이버 검색광고",
    description: '"카테고리로 후보 상품군 추천받기" 기능 전용(선택)',
    providers: ["naver_ads_api_key", "naver_ads_secret_key", "naver_ads_customer_id"],
  },
  {
    title: "🌏 알리익스프레스",
    description: '"상품소싱 마진계산기"의 해외 소싱 채널 전용(선택)',
    providers: ["aliexpress_app_key", "aliexpress_app_secret", "aliexpress_tracking_id"],
  },
  {
    title: "🏠 도매매(도매꾹)",
    description: '"상품소싱 마진계산기"의 국내 소싱 채널 전용(선택)',
    providers: ["domeggook_api_key"],
  },
  {
    title: "🏪 11번가",
    description: '"상품소싱 마진계산기"의 국내 오픈마켓 소싱 채널 + 트렌드 리포트 경쟁도 지표(선택)',
    providers: ["elevenst_api_key"],
  },
  {
    title: "📺 YouTube",
    description: "기회 점수에 영상 트렌드 신호(업로드량·조회수)를 더하는 용도(선택)",
    providers: ["youtube_api_key"],
  },
  {
    title: "🤖 AI (OpenAI / Gemini)",
    description: "기회 점수 추천 사유 생성 — 둘 중 1개만 등록하면 됩니다",
    providers: ["openai", "gemini"],
  },
];

const HELP_LINKS: Partial<
  Record<ApiKeyProvider, { url: string; label: string; description?: string; warning?: React.ReactNode }>
> = {
  naver_client_id: {
    url: "https://console.ncloud.com/naver-api-hub/application",
    label: "네이버클라우드 API HUB에서 애플리케이션 등록하기",
    description:
      "개인 회원가입으로 무료 이용 가능(사업자등록 불필요). NCP 계정 로그인 후 애플리케이션 등록 시 '쇼핑인사이트'를 선택하세요. 기존 developers.naver.com 방식은 2026-07-31부로 신규 발급이 종료되었습니다.",
  },
  naver_client_secret: {
    url: "https://console.ncloud.com/naver-api-hub/application",
    label: "네이버클라우드 API HUB에서 애플리케이션 등록하기",
  },
  naver_ads_api_key: {
    url: "https://searchad.naver.com",
    label: "네이버 검색광고에서 개인광고주로 가입 후 API 사용신청",
    description:
      "무료, 사업자등록 불필요(개인광고주 가입 가능). 로그인 → 광고시스템 → 도구 → API 사용 관리에서 신청하면 ACCESS LICENSE/SECRET KEY/CUSTOMER ID 3개가 발급됩니다. 카테고리 선택만으로 후보 상품군을 추천받는 기능에 쓰입니다.",
  },
  naver_ads_secret_key: {
    url: "https://searchad.naver.com",
    label: "네이버 검색광고에서 개인광고주로 가입 후 API 사용신청",
  },
  naver_ads_customer_id: {
    url: "https://searchad.naver.com",
    label: "네이버 검색광고에서 개인광고주로 가입 후 API 사용신청",
    warning: (
      <>
        <p>
          광고 대시보드 URL(<span className="font-mono">ads.naver.com/manage/ad-accounts/숫자</span>)의
          숫자가 <span className="font-bold underline">아닙니다.</span>
        </p>
        <p>
          반드시 <span className="font-bold">&apos;도구 &gt; SA API 사용 관리&apos;</span> 화면에 표시된{" "}
          <span className="font-bold">CUSTOMER ID</span> 값을 넣어주세요.
        </p>
        <p>
          다른 값이면 <span className="font-bold">인증이 실패합니다.</span>
        </p>
      </>
    ),
  },
  aliexpress_app_key: {
    url: "https://portals.aliexpress.com",
    label: "알리익스프레스 포털에서 App Key/Secret 발급받기",
    description:
      "무료. portals.aliexpress.com에서 제휴 계정 가입 후 앱을 등록하면 App Key/App Secret이 발급됩니다. 리포트의 키워드별 \"알리 원가 비교\"에 쓰입니다.",
  },
  aliexpress_app_secret: {
    url: "https://portals.aliexpress.com",
    label: "알리익스프레스 포털에서 App Key/Secret 발급받기",
  },
  aliexpress_tracking_id: {
    url: "https://portals.aliexpress.com",
    label: "알리익스프레스 포털에서 Tracking ID 확인하기",
    description: "제휴 계정의 트래킹 ID(캠페인 식별용, 기본값 사용 가능)입니다.",
  },
  domeggook_api_key: {
    url: "https://mobile.domeggook.com/APIs/gate",
    label: "도매매(도매꾹)에서 Open API Key 발급받기",
    description:
      "무료, 승인 절차 없이 즉시 발급(Open API 등급). 도매꾹과 아이디를 공유하므로 도매꾹 로그인 후 위 링크에서 API Key 발급 및 관리를 진행하면 됩니다(1개 아이디당 최대 5개까지 발급 가능). 관세/부가세/해외운송비 계산이 필요 없는 국내 위탁소싱 원가 비교에 쓰입니다.",
  },
  youtube_api_key: {
    url: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    label: "Google Cloud Console에서 YouTube Data API v3 키 발급받기",
    description:
      "무료. Google Cloud 프로젝트에서 \"YouTube Data API v3\"를 사용 설정한 뒤 사용자 인증 정보 > API 키를 생성하면 됩니다(개인 Google 계정이면 충분, 사업자등록 불필요). 등록하면 트렌드 리포트의 기회 점수에 최근 관련 영상 업로드량·조회수 신호가 추가로 반영됩니다 — 없어도 리포트 생성은 정상 동작하는 선택 항목입니다.",
  },
  elevenst_api_key: {
    url: "https://openapi.11st.co.kr/openapi/OpenApiFrontMain.tmall",
    label: "11번가 OPEN API CENTER에서 서비스 등록하기",
    description:
      "무료. 셀러 등록 없이 개인 회원가입만으로 \"서비스 등록\" 후 즉시 API Key 발급(사업자등록 불필요). 상품/카테고리 조회만 되는 일반 Open API 등급이라 소싱 검색에 충분합니다. 발급받은 키는 유효기간이 180일이니, 만료되면 같은 화면에서 재발급받아 다시 등록해주세요.",
  },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Gemini 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: keys }, { data: smtpAccounts }, { data: solapiAccount }, { data: telegramLink }] = await Promise.all([
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase
      .from("user_smtp_accounts")
      .select("id, label, provider, smtp_host, smtp_port, smtp_user, from_name, is_active")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_telegram_links")
      .select("bot_username")
      .eq("user_id", user.id)
      .eq("program_slug", "trending-product-finder")
      .maybeSingle(),
  ]);
  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  // 다른 AIMaster 프로그램(stepmail 등)에서 이미 SMTP 계정을 등록했다면 공용 테이블이라
  // 여기서도 그대로 보인다.
  const knownSmtpProviders = new Set(SMTP_PROVIDER_PRESETS.map((p) => p.value));
  const smtpAccountsByProvider = new Map<string, SmtpAccountData[]>();
  for (const account of smtpAccounts ?? []) {
    const key = account.provider && knownSmtpProviders.has(account.provider) ? account.provider : "other";
    const list = smtpAccountsByProvider.get(key) ?? [];
    list.push(account);
    smtpAccountsByProvider.set(key, list);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          상품소싱 자동화에는 본인의 네이버클라우드 API HUB Client ID/Secret(관심도 추이 조회)과,
          OpenAI 또는 Gemini 중 1개(추천 사유 생성) 키가 필요합니다. 네이버 검색광고 키 3종은
          &quot;카테고리로 후보 상품군 추천받기&quot; 기능에만, 알리익스프레스 키 3종과 도매매·
          11번가 키는 각각 &quot;상품소싱 마진계산기&quot;의 해외/국내 소싱 채널에만, YouTube
          Data API 키는 기회 점수에 영상 트렌드 신호를 더하는 데만 필요한 선택 항목입니다.{" "}
          <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
          등록하지 않은 상태로 실행을 시도하면 등록 안내가 뜨고 막힙니다.
        </p>
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <div key={section.title} className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
                <p className="text-xs text-gray-500">{section.description}</p>
              </div>
              <div className="space-y-3">
                {section.providers.map((provider) => (
                  <ApiKeyRow
                    key={provider}
                    provider={provider}
                    label={PROVIDER_LABELS[provider]}
                    maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                    helpUrl={HELP_LINKS[provider]?.url}
                    helpLabel={HELP_LINKS[provider]?.label}
                    helpDescription={HELP_LINKS[provider]?.description}
                    helpWarning={HELP_LINKS[provider]?.warning}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <h2 className="mb-1 text-lg font-black text-gray-900">📣 리포트 자동 알림 (선택)</h2>
          <p className="text-xs text-gray-500">
            매일 자동 생성되는 트렌드 리포트를 로그인 없이도 이메일·카카오톡·텔레그램으로 요약
            받아볼 수 있습니다. 아래 중 등록해둔 채널로 자동 생성 시마다 발송됩니다. 다른
            AIMaster 프로그램(STEP Mail 등)에서 이미 등록하셨다면 이메일·카카오톡 계정은 공용
            테이블이라 여기서도 그대로 재사용됩니다(텔레그램은 프로그램마다 별도 연동).
          </p>
        </div>

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-900">📧 이메일 (SMTP)</h2>
            <p className="text-xs text-gray-500">
              본인 이메일 계정을 등록해두면 등록해둔 계정 중 &quot;사용 중&quot;인 것으로 발송됩니다.
            </p>
          </div>
          <div className="space-y-3">
            {SMTP_PROVIDER_PRESETS.map((preset) => (
              <ProviderAccountSection key={preset.value} preset={preset} accounts={smtpAccountsByProvider.get(preset.value) ?? []} />
            ))}
          </div>
        </div>

        <SolapiAccountSection account={solapiAccount ?? null} />

        <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-gray-900">📨 텔레그램 알림</h2>
            <p className="text-xs text-gray-500">봇을 연동해두면 리포트 요약을 텔레그램으로도 받을 수 있어요.</p>
          </div>

          {telegramLink ? (
            <div className="space-y-3">
              <p className="text-sm text-emerald-600">✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.</p>
              <form action={disconnectTelegramAction}>
                <button type="submit" className="rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                  연동 해제
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <ol className="list-inside list-decimal space-y-2 text-xs text-gray-600">
                <li>
                  텔레그램에서 <span className="font-semibold text-gray-900">@BotFather</span>를 검색해서 대화를 시작하세요.
                </li>
                <li>
                  <code className="rounded bg-gray-100 px-1 py-0.5">/newbot</code> 명령을 보내고, 안내에 따라 봇 이름을 정하세요
                  (마지막엔 반드시 <code className="rounded bg-gray-100 px-1 py-0.5">bot</code>으로 끝나야 해요).
                </li>
                <li>완료되면 BotFather가 토큰을 알려줘요. 그 값을 복사하세요.</li>
                <li>방금 만든 내 봇을 텔레그램에서 열고, 아무 메시지나 1개 보내세요.</li>
                <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
              </ol>
              <TelegramConnectForm />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
