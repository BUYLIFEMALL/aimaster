import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { PROVIDER_LABELS, maskApiKey } from "@/lib/apiKeys";
import { ApiKeyRow } from "@/components/settings/ApiKeyRow";
import type { ApiKeyProvider } from "@/types/database.types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 이 프로그램이 실제로 쓰는 provider: openai(이메일 초안 작성), gemini(이메일 핵심 주제를
// 반영한 이미지 생성 — blog의 NanoBanana 이미지 생성 패턴 참고, 선택 사항). 실제 발송 계정
// (SMTP)은 user_api_keys 구조(단일 api_key 문자열)와 안 맞아서 /accounts 페이지에서 별도로
// 관리한다. provider가 openai+gemini 2개뿐이라 그룹을 억지로 쪼개지 않고 "AI 이메일 작성"
// 박스 하나로 묶는다(trending-product-finder 설정 페이지의 그룹 박스 패턴 참고).
const PROVIDERS: ApiKeyProvider[] = ["openai", "gemini"];

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
      <h1 className="mb-2 text-2xl font-black text-gray-900">API 키 설정</h1>
      <p className="mb-6 text-sm text-gray-500">
        이메일 초안(제목/본문)을 AI로 작성하려면 본인의 OpenAI API 키가 필요합니다.{" "}
        <span className="font-semibold text-gray-900">앱(관리자) 공용 키로 대신 동작하지 않으며</span>,
        등록하지 않은 상태로 초안 생성을 시도하면 등록 안내 팝업이 뜨고 막힙니다. Gemini API 키를
        추가로 등록하면 초안 작성 시 이메일 핵심 주제를 반영한 이미지도 자동으로 함께
        만들어집니다(선택 사항 — 등록하지 않아도 텍스트 초안은 그대로 만들어집니다). 실제 메일을
        보내는 이메일 계정(SMTP)은 이 페이지가 아니라{" "}
        <a href="/accounts" className="font-semibold text-blue-600 hover:underline">
          이메일 계정
        </a>{" "}
        페이지에서 등록합니다.
      </p>
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-gray-900">🤖 AI 이메일 작성</h2>
          <p className="text-xs text-gray-500">이메일 초안(제목/본문) 생성 및 이미지 자동 생성(선택)</p>
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
