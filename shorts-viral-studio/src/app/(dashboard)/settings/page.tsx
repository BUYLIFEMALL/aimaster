import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveApiKeyAction, deleteApiKeyAction } from "@/lib/actions/settings";
import type { KeyProvider } from "@/lib/apiKeys";
import { GuideLinkButton } from "@/components/settings/GuideLinkButton";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROVIDER_INFO: { id: KeyProvider; name: string; desc: string; guideUrl: string; required?: boolean }[] = [
  {
    id: "youtube_api_key",
    name: "YouTube Data API v3 키",
    desc: "쇼츠 검색과 조회수·구독자·댓글 수집에 필수입니다. 구글 클라우드 콘솔에서 'YouTube Data API v3'를 사용 설정한 뒤 API 키를 만드세요. 검색 1회에 약 100유닛(기본 하루 1만유닛)이 사용됩니다.",
    guideUrl: "https://console.cloud.google.com/apis/library/youtube.googleapis.com",
    required: true,
  },
  {
    id: "gemini",
    name: "Google Gemini API 키",
    desc: "영상 직접 분석에 필요합니다(권장). Gemini를 쓰면 AI가 영상을 실제로 보고 분석합니다. aistudio.google.com에서 발급받을 수 있습니다.",
    guideUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "openai",
    name: "OpenAI API 키 (GPT)",
    desc: "소재·대본·프롬프트 생성에 쓸 수 있습니다. platform.openai.com에서 발급받은 'sk-...' 키를 입력하세요. (영상 직접 분석은 지원하지 않아 지표·댓글 기반 추정으로 동작합니다)",
    guideUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude API 키",
    desc: "소재·대본·프롬프트 생성에 쓸 수 있습니다. console.anthropic.com에서 발급받을 수 있습니다. (영상 직접 분석은 지원하지 않아 지표·댓글 기반 추정으로 동작합니다)",
    guideUrl: "https://console.anthropic.com/settings/keys",
  },
];

const GUIDES = [
  { guideId: "72d39d06-a7ca-4ab0-8327-f9bb085ac394", label: "YouTube Data API 키 발급받기" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급받기" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급받기" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급받기" },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient();

  const { data: rawKeys } = await admin.from("user_api_keys").select("provider, api_key").eq("user_id", user.id);

  const keys = (rawKeys as Array<{ provider: string; api_key: string }> | null) ?? [];
  const registeredMap = new Map(keys.map((k) => [k.provider, k.api_key]));

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">🔑 API키등록·플랫폼연동</h1>
        <p className="mt-1 text-sm text-neutral-500">
          이 프로그램은 회원님 본인의 키로 동작합니다. <strong>YouTube 키는 필수</strong>이고, AI 키는 셋 중{" "}
          <strong>1개 이상</strong> 등록하면 됩니다. 영상 직접 분석을 쓰려면 Gemini 키를 권장합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-800">
        💡 <strong>안내:</strong> AIMaster는 &apos;엔진은 우리가 만들고, 연료(API키)는 회원 본인 것을 쓴다&apos;는 원칙으로 운영됩니다.
        등록한 키는 회원님의 쇼츠 검색·분석·생성에만 사용되며, 다른 회원과 공유되지 않습니다.
      </div>

      <div className="space-y-4">
        {PROVIDER_INFO.map((item) => {
          const existingKey = registeredMap.get(item.id);
          const isRegistered = Boolean(existingKey);

          return (
            <div key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
              <div className="flex flex-col justify-between gap-2 border-b border-neutral-100 pb-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-neutral-900">{item.name}</span>
                  {item.required && (
                    <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-600">필수</span>
                  )}
                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                      ✓ 등록됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-500">
                      미등록
                    </span>
                  )}
                </div>
                <a
                  href={item.guideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-neutral-400 underline hover:text-neutral-700"
                >
                  키 발급 사이트 열기 ↗
                </a>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-neutral-500">{item.desc}</p>

              <div className="mt-4">
                {isRegistered ? (
                  <div className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3">
                    <span className="font-mono text-xs text-neutral-500">••••••••••••••••{existingKey?.slice(-4)}</span>
                    <form action={deleteApiKeyAction}>
                      <input type="hidden" name="provider" value={item.id} />
                      <button type="submit" className="text-xs font-semibold text-rose-500 hover:text-rose-700">
                        삭제
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={saveApiKeyAction} className="flex flex-col gap-2 sm:flex-row">
                    <input type="hidden" name="provider" value={item.id} />
                    <input
                      type="password"
                      name="apiKey"
                      placeholder="API 키를 여기에 붙여넣으세요"
                      required
                      maxLength={500}
                      className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-black"
                    >
                      저장하기
                    </button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-neutral-900">📖 연동 매뉴얼</h2>
        <p className="mt-1 text-xs text-neutral-500">
          버튼을 누르면 팝업창으로 열려, 이 화면 옆에 두고 그대로 따라 할 수 있습니다.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
