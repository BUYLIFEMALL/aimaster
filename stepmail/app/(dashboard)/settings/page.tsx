import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { memberSchedulerState } from "@/lib/schedulerMember/memberScheduler";
import { SchedulerModePicker } from "@/components/settings/SchedulerModePicker";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// app/(main)/guides의 platform_guides.id — 이 페이지가 실제로 쓰는 API에 해당하는 매뉴얼만
// 골랐다(2026-09-13, naver-cafe-poster에서 시작된 플랫폼 표준을 그대로 적용). SMTP 이메일
// 계정 연동은 /accounts 페이지에서 별도로 하므로 여기 대상에서 뺐다.
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
];

// 이 프로그램이 실제로 쓰는 provider: openai(이메일 초안 작성), gemini(이메일 핵심 주제를
// 반영한 이미지 생성 — blog의 NanoBanana 이미지 생성 패턴 참고, 선택 사항). 실제 발송 계정
// (SMTP)은 user_api_keys 구조(단일 api_key 문자열)와 안 맞아서 /accounts 페이지에서 별도로
// 관리한다. provider가 openai+gemini 2개뿐이라 그룹을 억지로 쪼개지 않고 "AI 이메일 작성"
// 박스 하나로 묶는다(trending-product-finder 설정 페이지의 그룹 박스 패턴 참고).
const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini"];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));
  // v1.27 문자 발송: 공용 user_solapi_accounts(예약 리마인드 등에서 연결했으면 그대로 보임)
  const { data: solapiAccount } = await supabase
    .from("user_solapi_accounts")
    .select("api_key, sender_phone, kakao_pf_id, rcs_brand_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const scheduler = await memberSchedulerState(createAdminClient() as unknown as SupabaseClient, user.id);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        이메일 초안(제목/본문)을 AI로 작성하려면 본인의 OpenAI API 키가 필요합니다.{" "}
        <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
        등록하지 않은 상태로 초안 생성을 시도하면 등록 안내 팝업이 뜨고 막힙니다. Gemini API 키를
        추가로 등록하면 초안 작성 시 이메일 핵심 주제를 반영한 이미지도 자동으로 함께
        만들어집니다(선택 사항 — 등록하지 않아도 텍스트 초안은 그대로 만들어집니다). 실제 메일을
        보내는 이메일 계정(SMTP)은 이 페이지가 아니라{" "}
        <a href="/accounts" className="font-semibold text-blue-600 hover:underline">
          이메일 계정
        </a>{" "}
        페이지에서 등록합니다.
      </p>
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">🤖 AI 이메일 작성</h2>
          <p className="text-xs text-gray-500">이메일 초안(제목/본문) 생성 및 이미지 자동 생성(선택)</p>
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
      </div>

      {/* 📱 문자(SMS·LMS) 차수 발송용 SOLAPI 계정(v1.27) — 화면·저장 함수는 booking-reminder와 같음 */}
      <div className="mt-5">
        <SolapiAccountSection account={solapiAccount ?? null} />
      </div>

      {/* ⏰ 예약 발송 실행 방식(v1.21, 지침 docs/SCHEDULER_POLICY.md) — 캠페인 켜기/끄기는 「예약 발송」 화면에서 한다 */}
      <section className="mt-5 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">⏰ 예약 발행</h2>
          <p className="text-xs text-gray-500">
            캠페인 예약 발송을 무엇으로 돌릴지 고릅니다. 기본은 「AIMaster 기본(Vercel)」이라 따로 할 일이 없고,
            본인 계정으로 돌리고 싶으면 「내 cron-job.org」를 고르세요. 캠페인 켜기/끄기는 「예약 발송」 화면에서 합니다.
          </p>
        </div>
        <SchedulerModePicker initialMode={scheduler.mode} platformAvailable={scheduler.platformAvailable} hasKey={scheduler.hasKey} />
        <p className="mb-2 text-xs font-semibold text-gray-800">cron-job.org API 키 (「내 cron-job.org」를 쓸 때만)</p>
        <ol className="mb-3 list-decimal space-y-1 pl-4 text-xs text-gray-600">
          <li><a className="font-semibold underline" href="https://console.cron-job.org/signup" target="_blank" rel="noopener noreferrer">cron-job.org</a> 무료 가입 → 이메일 인증 → 로그인</li>
          <li>콘솔 <strong>Settings → API</strong> → <strong>Create API key</strong> → 키 복사 (<strong>IP 제한은 켜지 마세요</strong>)</li>
          <li>아래에 붙여 넣고 저장 → 위에서 「내 cron-job.org」 선택. 이 키는 예약 기능이 있는 다른 프로그램에서도 그대로 씁니다.</li>
        </ol>
        <ApiKeyRow
          provider="cronjob_org_api_key"
          label={PROVIDER_LABELS.cronjob_org_api_key}
          maskedValue={keyMap.has("cronjob_org_api_key") ? maskApiKey(keyMap.get("cronjob_org_api_key")!) : null}
        />
      </section>

      <section className="mt-5 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">📖 연동 매뉴얼</h2>
          <p className="text-xs text-gray-500">
            이 프로그램에서 사용하는 API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할
            수 있습니다.
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
