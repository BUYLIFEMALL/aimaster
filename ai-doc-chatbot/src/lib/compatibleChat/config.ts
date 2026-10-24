// OpenAI 호환 텍스트 공급자 기준. 공식 문서 검증: docs/analysis-autogemma-starter-20261024/OFFICIAL_PROVIDERS_20261024.md
// 이 파일에는 공개 설정만 둔다. 회원 키/계정 값은 서버에서만 조회한다.
export type CompatibleProvider = "groq" | "openrouter" | "cloudflare" | "nvidia";
export type LegacyProvider = "upstage" | "gemini";
export type ChatSelection = { provider: CompatibleProvider | LegacyProvider; model: string };

export const PROVIDERS = [
  { id: "groq", name: "Groq", enabled: true, key: "groq", models: ["openai/gpt-oss-20b", "openai/gpt-oss-120b"], console: "https://console.groq.com/keys", docs: "https://console.groq.com/docs/rate-limits", note: "무료 한도는 본인 Groq 계정의 Limits에서 확인해 주세요." },
  { id: "openrouter", name: "OpenRouter", enabled: true, key: "openrouter", models: ["meta-llama/llama-3.3-70b-instruct:free"], console: "https://openrouter.ai/settings/keys", docs: "https://openrouter.ai/pricing", note: "고정 무료 모델만 사용합니다. 기본 하루 50회·분당 20회이며 계정 조건에 따라 다릅니다." },
  { id: "cloudflare", name: "Cloudflare Workers AI", enabled: true, key: "cloudflare_workers_ai_token", models: ["@cf/meta/llama-3.2-3b-instruct", "@cf/meta/llama-3.1-8b-instruct-fp8"], console: "https://dash.cloudflare.com/profile/api-tokens", docs: "https://developers.cloudflare.com/workers-ai/platform/pricing/", note: "계정 ID도 필요합니다. 하루 무료 10,000 Neurons는 호출 횟수와 다릅니다. Paid 계정은 초과분이 과금됩니다." },
  { id: "nvidia", name: "NVIDIA NIM", enabled: false, key: "nvidia", models: ["meta/llama-3.1-8b-instruct"], console: "https://build.nvidia.com/", docs: "https://docs.api.nvidia.com/nim/docs/product", note: "무료 개발·시험용과 운영 서비스 조건이 달라 운영 연결은 확인 대기 중입니다." },
] as const;

export const ACTIVE_PROVIDERS = PROVIDERS.filter((p) => p.enabled);
export const KEY_FIELDS = [
  ...ACTIVE_PROVIDERS.map((p) => ({ key: p.key, label: `${p.name} API 키`, purpose: "대화·번역·요약에 사용", console: p.console, linkLabel: "API 키 생성·등록" })),
  { key: "cloudflare_account_id", label: "Cloudflare 계정 식별번호(Account ID)", purpose: "Cloudflare AI 연결에 사용", console: "https://dash.cloudflare.com/?to=/:account/workers-and-pages", linkLabel: "계정 식별번호 확인" },
];

export class CompatibleChatError extends Error {
  constructor(message: string, public status = 400, public needApiKey = false) { super(message); }
}

export function selectCompatible(provider: unknown, model: unknown) {
  const config = PROVIDERS.find((p) => p.id === provider);
  if (!config || !config.enabled) throw new CompatibleChatError("지원하지 않거나 운영 연결이 준비되지 않은 AI 공급자입니다.");
  const selected = model === undefined ? config.models[0] : model;
  if (typeof selected !== "string" || !(config.models as readonly string[]).includes(selected)) {
    throw new CompatibleChatError("이 공급자에서 지원하는 모델을 다시 선택해 주세요. 유료 모델로 자동 변경하지 않습니다.");
  }
  return { provider: config.id, model: selected, config };
}

export function credentialValue(provider: unknown, value: unknown): { provider: string; value: string } {
  if (typeof provider !== "string" || !KEY_FIELDS.some((p) => p.key === provider)) throw new CompatibleChatError("등록할 공용 키 항목을 다시 선택해 주세요.");
  if (typeof value !== "string" || !value.trim() || value.trim().length > 4096 || /\s|[\u0000-\u001f\u007f]/.test(value.trim())) {
    throw new CompatibleChatError("공백이나 줄바꿈 없이 본인 키 값을 입력해 주세요.");
  }
  const cleaned = value.trim();
  if (provider === "cloudflare_account_id" && !/^[a-f0-9]{32}$/i.test(cleaned)) throw new CompatibleChatError("Cloudflare 계정 식별번호(Account ID)는 로그인 이메일이 아닙니다. Workers & Pages의 Account Details에서 복사한 32자리 영문·숫자 값을 입력해 주세요.");
  return { provider, value: cleaned };
}

export function endpointFor(provider: unknown, model: unknown, accountId?: string) {
  const selected = selectCompatible(provider, model);
  let base: string;
  if (selected.provider === "groq") base = "https://api.groq.com/openai/v1";
  else if (selected.provider === "openrouter") base = "https://openrouter.ai/api/v1";
  else {
    const account = credentialValue("cloudflare_account_id", accountId).value;
    base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`;
  }
  return { ...selected, url: `${base}/chat/completions` };
}
