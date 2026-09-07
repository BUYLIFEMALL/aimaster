import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const META_PROVIDERS: ApiKeyProvider[] = ["meta_app_id", "meta_app_secret"];

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

        {/* 🔑 API 키 등록 및 연동 그룹 (Instagram Login, BYOK 방식 — 대체/fallback 연결 방법) */}
        <div className="rounded-2xl border-2 border-neutral-300 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h2 className="text-sm font-bold text-neutral-900">🔑 API 키 등록 및 연동</h2>
            <p className="text-xs text-neutral-500">
              <Link href="/accounts" className="font-medium text-blue-600 hover:underline">
                계정 연결 페이지
              </Link>
              의 기본(Facebook) 방식으로 연결이 안 될 때 쓰는 대체 연결 방법입니다. 본인 소유의
              Meta 앱 App ID/Secret을 등록한 뒤, 계정 연결 페이지에서 &quot;API 키 방식으로
              연결하기&quot;를 눌러주세요.
            </p>
          </div>

          <div className="mb-3 space-y-2 rounded-lg bg-neutral-50 p-3 text-xs text-neutral-500">
            <p>
              Meta App Dashboard에서 만든 앱의 유효한 OAuth 리디렉션 URI에 아래 주소를 추가로
              등록해주셔야 합니다. 또한 그 앱의 &quot;역할&quot; 메뉴에서 본인 인스타그램 계정을
              테스터(tester)로 추가해두어야 App Review 없이 바로 연결할 수 있습니다.
            </p>
            <code className="block break-all rounded bg-neutral-100 px-2 py-1.5 text-neutral-800">
              {process.env.NEXT_PUBLIC_SITE_URL ?? "https://insta-auto-poster.vercel.app"}/api/instagram/callback/byok
            </code>
            <p>인스타그램 비즈니스 또는 크리에이터(전문) 계정만 연결할 수 있습니다(개인 계정 불가).</p>
          </div>

          <div className="space-y-3">
            {META_PROVIDERS.map((provider) => (
              <ApiKeyRow
                key={provider}
                provider={provider}
                label={PROVIDER_LABELS[provider]}
                maskedValue={keyMap.has(provider) ? maskApiKey(keyMap.get(provider)!) : null}
                helpUrl="https://developers.facebook.com/apps"
                helpLabel="Meta App Dashboard에서 발급받기"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
