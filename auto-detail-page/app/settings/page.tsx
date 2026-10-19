import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

// 이 프로그램이 실제로 쓰는 provider: anthropic(상세페이지 본문 카피),
// gemini(나노바나나 이미지), openai(GPT Image), replicate(FLUX 이미지)
const PROVIDERS: ApiKeyProvider[] = ["anthropic", "gemini", "openai", "replicate"];

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
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* 상단 브레드크럼 */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <div className="flex items-center gap-2">
          <Link href="/" className="hover:text-blue-600 transition-colors">
            🛍️ 제작 스튜디오
          </Link>
          <span>/</span>
          <span className="text-slate-800">API 키 설정</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/guide" className="text-amber-600 hover:text-amber-700">
            📖 가이드북 보기
          </Link>
          <a href={`${MAIN_SITE_URL}/programs`} className="text-slate-400 hover:text-slate-700">
            ← 전체 프로그램
          </a>
        </div>
      </div>

      {/* 헤더 카드 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔑</span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">API 키 & 플랫폼 연동 설정</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          상세페이지 생성(Claude)과 고화질 이미지 생성(Gemini/FLUX/GPT)을 위해 본인의 API 키를 등록하세요.
          <br className="hidden sm:inline" />
          <strong className="text-slate-800">AIMaster는 사용자 본인 키 원칙을 엄격히 준수</strong>하며,
          공용 키로 폴백하지 않고 개인 계정에 안전하게 암호화 보관됩니다.
        </p>
      </div>

      {/* 키 등록 리스트 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>⚡</span>
          <span>지원 AI 모델 제공자</span>
        </h2>
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

      {/* 외부 연동 매뉴얼 팝업 링크 섹션 */}
      <section className="bg-slate-50 rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>📖</span>
            <span>API 키 발급 외부 매뉴얼</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            API 키 발급이 처음이신가요? 아래 가이드 링크를 클릭하시면 팝업창에서 손쉽게 확인하실 수 있습니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {GUIDE_LINKS.map((guide) => (
            <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
          ))}
        </div>
      </section>
    </main>
  );
}
