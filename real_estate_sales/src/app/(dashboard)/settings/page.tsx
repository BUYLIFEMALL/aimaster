import { PageHero } from "@/components/ui/PageHero";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { TelegramConnectForm } from "@/components/settings/TelegramConnectForm";
import { disconnectTelegramAction } from "@/lib/actions/telegram";
import { SolapiAccountSection } from "@/components/settings/SolapiAccountSection";
import { KakaoTemplateSection } from "@/components/settings/KakaoTemplateSection";
import { Button } from "@/components/ui/Button";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { ModelPreferenceForm } from "@/components/settings/ModelPreferenceForm";
import { AutoAnalyzeForm } from "@/components/settings/AutoAnalyzeForm";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";
import type { AnalysisModel } from "@/lib/ai/models";

const PROVIDERS: ApiKeyProvider[] = ["openai", "perplexity"];
const PUBLIC_DATA_PROVIDERS: ApiKeyProvider[] = [
  "seoul_opendata_api_key",
  "data_go_kr_service_key",
  "vworld_api_key",
  "vworld_domain",
];

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API/플랫폼에 해당하는
// 매뉴얼만 골랐다(naver-cafe-poster에서 만든 "연동 매뉴얼" 패턴을 전 서브프로젝트로 확장,
// 2026-09-13).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "1df95d8b-6a27-4de0-b1d9-8bbc218534ad", label: "Perplexity API 키 발급받기" },
  { guideId: "eb8f5eaf-6ef7-46b8-9b05-994e944fe69a", label: "SOLAPI(카카오톡 알림톡/친구톡) API 키 발급받기" },
  { guideId: "f43e8ebe-a930-4933-b965-7068b38d79aa", label: "텔레그램 봇 만들기" },
];

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: telegramLink }, { data: apiKeys }, { data: preference }, { data: solapiAccount }, { data: kakaoTemplate }] = await Promise.all([
    supabase
      .from("user_telegram_links")
      .select("bot_username, chat_id, linked_at")
      .eq("user_id", user.id)
      .eq("program_slug", "real-estate-sales")
      .maybeSingle(),
    supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id),
    supabase
      .from("real_estate_user_preferences")
      .select("preferred_model, auto_analyze_on_notify")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_solapi_accounts")
      .select("api_key, sender_phone, kakao_pf_id")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("real_estate_kakao_templates")
      .select("template_id")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  const keyMap = new Map((apiKeys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHero
        badge="🔑 API키등록·플랫폼연동"
        title="API 키·텔레그램 연결"
        description="AI 투자 분석에 쓸 OpenAI·Perplexity 키와 새 실거래 알림을 받을 텔레그램 봇을 회원님 본인 것으로 등록합니다. 운영자 키로 대신 동작하지 않아요."
      />

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-medium text-mx-text">🤖 AI 분석 키 (OpenAI / Perplexity)</h2>
          <p className="text-sm text-mx-muted">
            AI 분석(투자 매력도 분석)에 사용돼요. 등록하지 않으면 분석 기능을 쓸 수 없어요.
          </p>
        </div>
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-5">
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
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-gold">공공데이터 키 (선택)</h2>
          <p className="text-sm text-mx-muted">
            실거래·건축물대장·공시가격 조회에 쓰입니다. 등록하지 않으면 운영자 공용 키로 조회되고, 본인 키를 등록하면 본인 키로 조회돼요(호출 한도가 걱정되면 등록하세요). 브이월드는 키와 도메인을 함께 등록해야 적용됩니다.
          </p>
        </div>
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-5">
          <div className="space-y-3">
            {PUBLIC_DATA_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              />
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-mx-text">AI 분석 모델</h2>
        <p className="mb-3 text-sm text-mx-muted">
          매물 상세 화면의 [AI 분석 실행] 버튼과, 아래에서 켠 경우 예약 조회 알림의 자동 분석에 이 모델을 씁니다.
          <br />
          상세 화면은 열기만 해서는 분석하지 않습니다(요금은 버튼을 누를 때만).
        </p>
        <ModelPreferenceForm currentModel={(preference?.preferred_model as AnalysisModel) ?? null} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-mx-text">예약 조회 알림의 AI 분석</h2>
        <AutoAnalyzeForm enabled={preference?.auto_analyze_on_notify ?? true} />
      </section>

      <section>
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-5 space-y-4">
          <SolapiAccountSection account={solapiAccount ?? null} />
          <KakaoTemplateSection templateId={kakaoTemplate?.template_id ?? null} />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-medium text-mx-text">📨 텔레그램 봇 연동</h2>
          <p className="text-sm text-mx-muted">
            새 매물이 발견되면 본인 텔레그램 봇으로 알림과 AI 분석 결과를 받아요.
          </p>
        </div>
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-5">
          {telegramLink ? (
            <div className="space-y-3 rounded-xl border border-mx-border bg-dark-50 p-4">
              <p className="text-sm text-mx-success">
                ✅ @{telegramLink.bot_username ?? "내 봇"}으로 연동되어 있어요.
              </p>
              <form action={disconnectTelegramAction}>
                <Button type="submit" variant="danger">
                  연동 해제
                </Button>
              </form>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-mx-border bg-dark-50 p-4">
              <ol className="list-inside list-decimal space-y-2 text-sm text-mx-text">
                <li>
                  텔레그램에서 <span className="text-gold-light">@BotFather</span>를 검색해서 대화를
                  시작하세요.
                </li>
                <li>
                  <code className="rounded bg-dark-200 px-1 py-0.5">/newbot</code> 명령을 보내고,
                  안내에 따라 봇 이름을 정하세요 (마지막엔 반드시 <code className="rounded bg-dark-200 px-1 py-0.5">bot</code>으로
                  끝나야 해요, 예: <code className="rounded bg-dark-200 px-1 py-0.5">my_realestate_bot</code>).
                </li>
                <li>
                  완료되면 BotFather가 <strong>토큰</strong>(숫자:영문조합 문자열)을 알려줘요. 그
                  값을 복사하세요.
                </li>
                <li>
                  방금 만든 내 봇을 텔레그램에서 열고, <strong>아무 메시지나 1개</strong> 보내세요
                  (예: &quot;안녕&quot;).
                </li>
                <li>아래 입력창에 토큰을 붙여넣고 &quot;연동 확인하기&quot;를 눌러주세요.</li>
              </ol>
              <TelegramConnectForm />
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-medium text-mx-text">📖 연동 매뉴얼</h2>
          <p className="text-sm text-mx-muted">
            이 프로그램에서 사용하는 API 키·플랫폼 연동 방법을 팝업창으로 열어 옆에 두고 그대로
            따라 할 수 있어요.
          </p>
        </div>
        <div className="rounded-2xl border border-mx-border bg-mx-surface p-5">
          <div className="flex flex-wrap gap-2">
            {GUIDE_LINKS.map((guide) => (
              <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
