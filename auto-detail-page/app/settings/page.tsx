import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 이 프로그램이 실제로 쓰는 provider만 노출한다: anthropic(상세페이지 본문),
// gemini(나노바나나 이미지), openai(GPT Image 1), replicate(FLUX 이미지).
const PROVIDERS: ApiKeyProvider[] = ["anthropic", "gemini", "openai", "replicate"];

// app/(main)/guides의 platform_guides.id — 이 프로그램이 실제로 쓰는 API에 해당하는
// 매뉴얼만 골랐다(2026-09-13, naver-cafe-poster 패턴을 전체 서브프로젝트로 확대 적용).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "78a00b16-eef5-42be-810b-80c513d57ab4", label: "Replicate(FLUX) API 키 발급받기" },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keyMap = new Map((keys ?? []).map((k) => [k.provider, k.api_key]));

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1">
          ← 상세페이지 만들기로 돌아가기
        </Link>
        <a
          href={`${MAIN_SITE_URL}/programs`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          ← 다른 프로그램 보기
        </a>
        <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
        <p className="mb-6 text-sm text-gray-500">
          상세페이지 생성(Claude)과 이미지 생성 기능을 쓰려면 반드시 본인의 API 키를 등록해야
          합니다.{" "}
          <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
          등록하지 않은 상태로 생성을 시도하면 등록 안내 팝업이 뜨고 막힙니다.
        </p>
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

        <section className="mt-8 rounded-2xl border-2 border-gray-200 bg-gray-50 p-5 shadow-sm">
          <div className="mb-4">
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
    </main>
  );
}
