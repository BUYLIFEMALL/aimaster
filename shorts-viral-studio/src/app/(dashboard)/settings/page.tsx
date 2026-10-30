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
    desc: "영상 직접 분석에 필요합니다(강력 권장). Gemini를 쓰면 AI가 영상을 실제로 보고 컷 전환과 소리를 정밀 분석합니다. aistudio.google.com에서 무료로 발급받을 수 있습니다.",
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
  { guideId: "72d39d06-a7ca-4ab0-8327-f9bb085ac394", label: "YouTube Data API 키 발급 가이드" },
  { guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4", label: "Google Gemini API 키 발급 가이드" },
  { guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a", label: "OpenAI API 키 발급 가이드" },
  { guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a", label: "Anthropic Claude API 키 발급 가이드" },
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
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-600 mb-2">
          <span>🔒 회원 본인 키 보안 격리 원칙</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900">
          플랫폼 연동 및 API 키 관리 센터
        </h1>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          이 프로그램은 회원님 본인의 API 키로 동작합니다. <strong>YouTube 키는 필수</strong>이고, AI 엔진은 셋 중{" "}
          <strong>1개 이상</strong> 등록하시면 바로 사용할 수 있습니다. 영상 직접 분석을 위해 Gemini 키 등록을 강력 추천합니다.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 font-medium">
        💡 <strong>안내:</strong> AIMaster는 &apos;엔진은 우리가 만들고, 연료(API키)는 회원 본인 것을 쓴다&apos;는 원칙으로 운영됩니다.
        등록한 키는 회원님의 쇼츠 검색·분석·생성에만 사용되며, 타 회원이나 서버와 절대 공유되지 않습니다.
      </div>

      <div className="space-y-4">
        {PROVIDER_INFO.map((item) => {
          const existingKey = registeredMap.get(item.id);
          const isRegistered = Boolean(existingKey);

          return (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-slate-900">{item.name}</span>
                  {item.required && (
                    <span className="rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-black text-red-600">
                      필수 연동
                    </span>
                  )}
                  {isRegistered ? (
                    <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-700">
                      ✓ 정상 등록됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
                      미등록
                    </span>
                  )}
                </div>
                <a
                  href={item.guideUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-create-key"
                >
                  <span>키 발급 바로가기</span>
                  <span>↗</span>
                </a>
              </div>

              <p className="mt-2.5 text-xs text-slate-600 leading-relaxed font-medium">{item.desc}</p>

              <form action={saveApiKeyAction} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
                <input type="hidden" name="provider" value={item.id} />
                <input
                  type="password"
                  name="apiKey"
                  defaultValue={existingKey ? "••••••••••••••••••••••••" : ""}
                  placeholder={existingKey ? "등록된 키 유지 중 (변경하려면 새로 입력)" : "새 키 입력"}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50/50 px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-red-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  className="btn-3d-yt-red px-5 py-2 text-xs font-bold text-white shadow-xs"
                >
                  {isRegistered ? "키 갱신" : "키 등록"}
                </button>
              </form>

              {isRegistered && (
                <form action={deleteApiKeyAction} className="mt-2 text-right">
                  <input type="hidden" name="provider" value={item.id} />
                  <button
                    type="submit"
                    className="text-xs text-slate-400 underline hover:text-red-600 font-medium"
                  >
                    등록된 키 삭제
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-2xs">
        <h2 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2">
          📖 키 발급 가이드가 필요하신가요?
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <GuideLinkButton key={g.guideId} guideId={g.guideId} label={g.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
