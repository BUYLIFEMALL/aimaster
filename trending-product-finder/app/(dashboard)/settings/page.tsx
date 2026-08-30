import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROVIDERS: ApiKeyProvider[] = ["naver_client_id", "naver_client_secret", "openai", "gemini"];

const HELP_LINKS: Partial<Record<ApiKeyProvider, { url: string; label: string; description?: string }>> = {
  naver_client_id: {
    url: "https://developers.naver.com/apps/#/register",
    label: "네이버 개발자센터에서 애플리케이션 등록하기",
    description: "사용 API로 '검색'과 '데이터랩(쇼핑인사이트)'을 함께 선택해야 두 기능 모두 사용 가능합니다.",
  },
  naver_client_secret: {
    url: "https://developers.naver.com/apps/#/register",
    label: "네이버 개발자센터에서 애플리케이션 등록하기",
  },
  openai: { url: "https://platform.openai.com/api-keys", label: "OpenAI 키 발급받기" },
  gemini: { url: "https://aistudio.google.com/apikey", label: "Gemini 키 발급받기" },
};

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keys } = await supabase.from("user_api_keys").select("provider, api_key").eq("user_id", user.id);
  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          AI 소싱 트렌드 발굴에는 본인의 네이버 개발자센터 Client ID/Secret(관심도 추이·경쟁 상품
          수 조회)과, OpenAI 또는 Gemini 중 1개(추천 사유 생성) 키가 필요합니다.{" "}
          <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
          등록하지 않은 상태로 실행을 시도하면 등록 안내가 뜨고 막힙니다.
        </p>
        <div className="space-y-3">
          {PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
              helpUrl={HELP_LINKS[provider]?.url}
              helpLabel={HELP_LINKS[provider]?.label}
              helpDescription={HELP_LINKS[provider]?.description}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
