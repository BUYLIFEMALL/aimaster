import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey, type ApiKeyProvider } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const AI_PROVIDERS: ApiKeyProvider[] = ["gemini", "openai"];

// 루트 AIMaster의 platform_guides.id — 이미 등록된 OpenAI/Gemini 가이드를 그대로 재사용한다
// (naver-cafe-poster/mbti-character 설정 페이지와 동일한 UUID, 새로 만들지 않음).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map(
    ((keys ?? []) as { provider: string; api_key: string }[]).map((k) => [k.provider, k.api_key]),
  );

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <h1 className="text-xl font-black text-neutral-900 mb-2">API키등록·플랫폼연동</h1>
      <p className="text-sm text-neutral-500 mb-8 leading-relaxed">
        AI 카드 일러스트 생성(Gemini)과 AI 타로 해석 생성(OpenAI)에 필요한 본인의 API 키를
        등록해주세요. 등록한 키는 이 계정에만 저장되고, 생성 비용은 본인 키로만 청구됩니다.
      </p>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5 mb-6">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">🎨 AI 카드 일러스트 · 해석 생성</h2>
          <p className="text-xs text-neutral-500">
            결과 화면에서 뽑힌 카드 3장마다 Gemini(나노바나나)가 새 일러스트를 그려주고,
            OpenAI가 질문과 카드 조합에 맞춘 타로 해석을 써드립니다. 둘 중 하나만 등록해도
            등록한 기능은 바로 이용할 수 있어요.
          </p>
        </div>
        <div className="space-y-3">
          {AI_PROVIDERS.map((provider) => (
            <ApiKeyRow
              key={provider}
              provider={provider}
              label={PROVIDER_LABELS[provider]}
              maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
            />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-5">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
          <p className="text-xs text-neutral-500">
            API 키 발급 방법을 팝업창으로 열어 옆에 두고 그대로 따라 할 수 있습니다.
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
