import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 프로바이더를 성격별 섹션으로 묶어서 보여준다 — 검색결과 수집용 키와 AI 리서치/분석용
// 키가 한눈에 구분되도록 그룹핑한다.
const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "🔍 검색결과 수집 (SerpApi)",
    description: "구글/네이버 검색결과에서 상위 노출 도메인을 가져오는 필수 키",
    providers: ["serpapi"],
  },
  {
    title: "🤖 AI 리서치·분석 (Perplexity / OpenAI / Anthropic)",
    description:
      "경쟁사 리서치와 분석 리포트를 만드는 AI 키 — Perplexity/OpenAI는 필수, Anthropic은 리포트를 HTML로 변환하는 선택 기능",
    providers: ["perplexity", "openai", "anthropic"],
  },
];

const HELP_LINKS: Partial<
  Record<ApiKeyProvider, { url: string; label: string; highlight?: string; description?: string }>
> = {
  serpapi: {
    url: "https://serpapi.com/manage-api-key",
    label: "SerpApi 키 발급받기 (serpapi.com)",
    highlight: "무료 플랜: 월 250회 검색 무료",
    description: "일 단위 한도는 따로 없음 · 250회 소진 후에는 유료 플랜 결제 필요",
  },
  perplexity: { url: "https://www.perplexity.ai/settings/api", label: "Perplexity 키 발급받기" },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  anthropic: { url: "https://console.anthropic.com/settings/keys", label: "Anthropic 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        경쟁사 키워드 분석에는 본인의 SerpApi(구글/네이버 검색결과 조회) 키가 필요합니다.{" "}
        <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
        등록하지 않은 상태로 분석을 시도하면 등록 안내가 뜨고 막힙니다. Perplexity/OpenAI는 경쟁사
        리서치와 분석 리포트 작성에 쓰이고, Anthropic은 리포트를 보기 좋은 HTML로 변환하는
        선택 기능에만 쓰입니다(등록 안 해도 분석 자체는 정상 동작).
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
                  helpHighlight={HELP_LINKS[provider]?.highlight}
                  helpDescription={HELP_LINKS[provider]?.description}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
