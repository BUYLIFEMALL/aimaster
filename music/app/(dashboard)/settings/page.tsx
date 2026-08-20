import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { SunoCreditsCard } from "@/components/settings/SunoCreditsCard";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

// 이 프로그램이 실제로 쓰는 provider만 노출한다: openai(곡 기획/가사), gemini(나노바나나 —
// 곡 분위기에 맞는 고퀄리티 앨범 커버 생성, 선택사항), suno(실제 곡 생성). suno는 바로 아래
// SunoCreditsCard(크레딧 조회)와 같은 서비스라 맨 마지막에 붙여서 두 섹션이 이어지게 한다.
const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini", "suno"];

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
      <Link href="/plannings" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 기획 목록으로 돌아가기
      </Link>
      <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        곡 기획(스타일/제목/가사)에는 본인의 OpenAI API 키가, 실제 곡 생성에는 본인의 Suno API 키가
        필요합니다.{" "}
        <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
        등록하지 않은 상태로 생성을 시도하면 등록 안내 팝업이 뜨고 막힙니다. Gemini API 키는
        선택사항으로, 등록하면 Suno가 기본으로 주는 커버 대신 곡 분위기/가사에 맞는 고퀄리티
        앨범 커버를 나노바나나로 대신 만들어드립니다(등록 안 해도 곡 생성 자체는 정상 동작합니다).
      </p>
      <div className="space-y-3">
        {PROVIDERS.map((provider) => (
          <ApiKeyRow
            key={provider}
            provider={provider}
            label={PROVIDER_LABELS[provider]}
            maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            helpUrl={provider === "suno" ? "https://sunoapi.org/ko/api-key" : undefined}
            helpLabel={provider === "suno" ? "본인 명의로 API 키를 생성해서 등록해주세요 (sunoapi.org)" : undefined}
            helpDescription={provider === "suno" ? "최초 무료 50크레딧(3회생성) 제공 | 1회 호출시 12크레딧 사용" : undefined}
          />
        ))}
      </div>

      <div className="mt-8">
        <SunoCreditsCard />
      </div>
    </div>
  );
}
