import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

// 이 프로그램이 실제로 쓰는 provider만 노출한다: gemini(상품분석 + 나노바나나 이미지생성).
const PROVIDERS: ApiKeyProvider[] = ["gemini"];

// app/(main)/guides의 platform_guides.id (naver-cafe-poster의 "연동 매뉴얼" 패턴을 전
// 서브프로젝트로 확장, 2026-09-13).
const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
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
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href="/products" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← 상품 목록으로 돌아가기
      </Link>
      <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        상품분석과 이미지 생성 기능 사용 전 본인의 Gemini API 키를 등록 후 사용합니다.
      </p>
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">🤖 Gemini</h2>
          <p className="text-xs text-gray-500">상품분석과 상세페이지 섹션 이미지(나노바나나) 생성에 사용됩니다.</p>
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

      <div className="mt-5 rounded-2xl border-2 border-gray-200 bg-gray-100 p-5 shadow-sm">
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
      </div>
    </div>
  );
}
