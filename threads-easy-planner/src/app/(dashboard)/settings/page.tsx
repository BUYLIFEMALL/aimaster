import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { saveApiKeyAction, deleteApiKeyAction } from "@/lib/actions/settings";
import type { AIProvider } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROVIDER_INFO: { id: AIProvider; name: string; desc: string; guideUrl: string }[] = [
  {
    id: "openai",
    name: "OpenAI API 키 (GPT-4o, GPT-4.1)",
    desc: "가장 추천하는 AI 모델입니다. platform.openai.com에서 발급받은 'sk-...' 형태의 키를 입력하세요.",
    guideUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "gemini",
    name: "Google Gemini API 키 (Gemini 2.5 Flash)",
    desc: "속도가 빠르고 무료 사용량이 넉넉합니다. aistudio.google.com에서 발급받을 수 있습니다.",
    guideUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude API 키 (Claude 3.5 Sonnet)",
    desc: "자연스럽고 문장력이 뛰어납니다. console.anthropic.com에서 발급받을 수 있습니다.",
    guideUrl: "https://console.anthropic.com/settings/keys",
  },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient();

  const { data: rawKeys } = await admin
    .from("user_api_keys")
    .select("provider, api_key")
    .eq("user_id", user.id);

  const keys = (rawKeys as Array<{ provider: string; api_key: string }> | null) ?? [];
  const registeredMap = new Map(keys.map((k) => [k.provider, k.api_key]));


  return (
    <div className="w-full max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          🔑 AI API키 등록 및 관리
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          스레드 글 생성을 위해 본인의 AI 키를 등록해주세요. (셋 중 <strong>1개만 등록</strong>해도 바로 사용 가능합니다)
        </p>
      </div>

      <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-xs text-amber-800 leading-relaxed">
        💡 <strong>안내:</strong> AIMaster는 &apos;엔진은 우리가 만들고, 연료(API키)는 회원 본인 것을 쓴다&apos;는 원칙으로 운영됩니다.
        회원님의 API 키는 암호화되어 안전하게 보관되며, 오직 회원님의 글 생성에만 사용됩니다.
      </div>

      <div className="space-y-4">
        {PROVIDER_INFO.map((item) => {
          const existingKey = registeredMap.get(item.id);
          const isRegistered = Boolean(existingKey);

          return (
            <div
              key={item.id}
              className={`rounded-2xl border p-5 transition-all ${
                isRegistered
                  ? "bg-white border-emerald-200/80 shadow-xs"
                  : "bg-white border-neutral-200 shadow-xs"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-neutral-900">{item.name}</span>
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
                  className="text-xs text-neutral-400 hover:text-neutral-700 underline"
                >
                  키 발급 사이트 열기 ↗
                </a>
              </div>

              <p className="mt-2 text-xs text-neutral-500 leading-relaxed">
                {item.desc}
              </p>

              <div className="mt-4">
                {isRegistered ? (
                  <div className="flex items-center justify-between gap-3 bg-neutral-50 p-3 rounded-xl">
                    <span className="font-mono text-xs text-neutral-500">
                      ••••••••••••••••{existingKey?.slice(-4)}
                    </span>
                    <form action={deleteApiKeyAction}>
                      <input type="hidden" name="provider" value={item.id} />
                      <button
                        type="submit"
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700"
                      >
                        삭제
                      </button>
                    </form>
                  </div>
                ) : (
                  <form action={saveApiKeyAction} className="flex flex-col sm:flex-row gap-2">
                    <input type="hidden" name="provider" value={item.id} />
                    <input
                      type="password"
                      name="apiKey"
                      placeholder="API 키를 여기에 붙여넣으세요"
                      required
                      className="flex-1 rounded-xl border border-neutral-200 px-3.5 py-2 text-xs focus:border-neutral-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-black transition-colors"
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
    </div>
  );
}
