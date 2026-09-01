import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

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

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-semibold text-neutral-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-neutral-600">
        캡션/이미지 AI 생성 기능 사용전 본인의 API 키를 등록해야 합니다.
      </p>
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
      </div>
    </div>
  );
}
