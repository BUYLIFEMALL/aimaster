import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import { SunoCreditsCard } from "@/components/settings/SunoCreditsCard";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const GUIDE_LINKS: { guideId: string; label: string }[] = [
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "0ecb9a3c-e4f7-4229-8fc3-f74fdb6dc6fd", label: "SUNO(수노) API 연동하기" },
];

const SECTIONS: { title: string; description: string; providers: ApiKeyProvider[] }[] = [
  {
    title: "🤖 텍스트/이미지 생성 AI (OpenAI · Gemini · Claude)",
    description: "빠른 기획·자동 가사(음악 생성)에는 OpenAI가 필수입니다. 정밀 기획 스튜디오는 세 AI 중 고른 하나의 키만 있으면 되고, 앨범 커버 생성에는 Gemini가 선택사항으로 쓰입니다.",
    providers: ["openai", "gemini", "anthropic"],
  },
  {
    title: "🎵 음악 생성 엔진 (Suno AI)",
    description: "실제 곡 생성, 연장, MR 분리, WAV 변환에 쓰이는 키입니다. 최초 가입 시 무료 50 크레딧을 제공합니다.",
    providers: ["suno"],
  },
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 md:py-12">
      <Link
        href="/plannings"
        className="text-xs font-semibold text-zinc-400 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5 mb-6"
      >
        <span>← 곡 기획 목록으로 돌아가기</span>
      </Link>

      <div className="flex items-center gap-2.5 mb-2">
        <span className="text-2xl">🔑</span>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">API 키 등록 · 플랫폼 연동</h1>
      </div>
      <p className="mb-8 text-xs sm:text-sm text-zinc-400 leading-relaxed">
        음악(SUNO)자동화는 <span className="font-bold text-orange-400">사용자 본인의 API 키</span>로 직접 동작합니다.
        운영자 공용 키로 대신 처리하지 않으며, 각 제공사에서 발급받은 본인 키를 안전하게 등록해 사용해주세요.
      </p>

      <div className="space-y-6">
        {SECTIONS.map((section) => (
          <div
            key={section.title}
            className="rounded-2xl border border-[#272732] bg-[#14141b] p-6 shadow-xl shadow-black/40"
          >
            <div className="mb-4">
              <h2 className="text-sm sm:text-base font-bold text-white mb-1">{section.title}</h2>
              <p className="text-xs text-zinc-400">{section.description}</p>
            </div>
            <div className="space-y-3">
              {section.providers.map((provider) => (
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
            {section.providers.includes("suno") && (
              <div className="mt-4">
                <SunoCreditsCard />
              </div>
            )}
          </div>
        ))}

        <div className="rounded-2xl border border-[#272732] bg-[#14141b]/90 p-6 shadow-xl shadow-black/30 backdrop-blur-md">
          <div className="mb-4">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2 mb-1">
              <span>📖</span>
              <span>API 키 발급 연동 매뉴얼</span>
            </h2>
            <p className="text-xs text-zinc-400">
              API 키 발급이 처음이신가요? 팝업 가이드를 띄워 단계별로 쉽게 따라 하실 수 있습니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {GUIDE_LINKS.map((guide) => (
              <GuideLinkButton key={guide.guideId} guideId={guide.guideId} label={guide.label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
