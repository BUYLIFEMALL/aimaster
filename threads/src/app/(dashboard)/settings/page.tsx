import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini", "perplexity"];

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
        게시글/이미지 생성요청 전 본인의 API키를 등록후 사용하여야 합니다
      </p>
      <div className="rounded-2xl border-2 border-neutral-300 bg-neutral-100 p-4 shadow-sm">
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
      </div>
    </div>
  );
}
