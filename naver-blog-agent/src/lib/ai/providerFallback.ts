// 글감 정리처럼 "어느 AI든 한 곳만 성공하면 되는" 단계에서, 등록된 키를 순서대로 시도한다.
// 한 공급사가 크레딧 부족(429)·키 오류·일시 장애로 실패해도 다음 공급사로 넘어가고,
// 전부 실패했을 때는 어느 공급사가 왜 실패했는지 한 문장으로 알려준다. 키는 모두 회원 본인 키다.
export type FallbackProvider = "openai" | "gemini" | "anthropic";

export const FALLBACK_ORDER: FallbackProvider[] = ["openai", "gemini", "anthropic"];
export const PROVIDER_LABEL: Record<FallbackProvider, string> = { openai: "OpenAI", gemini: "Gemini", anthropic: "Claude" };

export type ProviderCaller = (apiKey: string, system: string, user: string) => Promise<string>;

export interface FallbackAttempt {
  provider: FallbackProvider;
  reason: string;
}

/** 공급사 오류를 회원이 이해할 수 있는 짧은 이유로 바꾼다. */
export function describeProviderError(err: unknown): string {
  const e = err as { status?: number; code?: string; message?: string } | null;
  const message = String(e?.message || err || "");
  const status = Number(e?.status);
  if (e?.code === "insufficient_quota" || e?.code === "credit_balance_exhausted" || /no credits|credit balance|insufficient[_ ]quota|billing/i.test(message)) {
    return "크레딧 또는 사용 한도 부족";
  }
  if (status === 429 || /\b429\b|rate limit|quota|RESOURCE_EXHAUSTED/i.test(message)) return "요청 한도 초과";
  if (status === 401 || status === 403 || /\b40[13]\b|api key|permission|unauthorized|invalid x-api-key/i.test(message)) return "API 키 오류";
  if (status === 404 || /\b404\b|model.*not found|not found.*model/i.test(message)) return "모델을 찾을 수 없음";
  return message.replace(/\s+/g, " ").slice(0, 80) || "알 수 없는 오류";
}

export async function runWithProviderFallback(
  aiKeys: Partial<Record<FallbackProvider, string | null | undefined>>,
  system: string,
  user: string,
  callers: Record<FallbackProvider, ProviderCaller>
): Promise<{ text: string; provider: FallbackProvider; attempts: FallbackAttempt[] }> {
  const candidates = FALLBACK_ORDER.filter((provider) => Boolean(aiKeys[provider]));
  if (candidates.length === 0) {
    throw new Error("AI API 키(OpenAI, Gemini, 또는 Claude)가 등록되어 있지 않습니다. [API키등록·플랫폼연동]에서 키를 등록해 주세요.");
  }

  const attempts: FallbackAttempt[] = [];
  for (const provider of candidates) {
    try {
      const text = (await callers[provider](aiKeys[provider] as string, system, user))?.trim();
      if (text) return { text, provider, attempts };
      attempts.push({ provider, reason: "빈 응답" });
    } catch (err) {
      attempts.push({ provider, reason: describeProviderError(err) });
    }
  }

  const detail = attempts.map((a) => `${PROVIDER_LABEL[a.provider]}(${a.reason})`).join(", ");
  throw new Error(`등록된 AI가 모두 실패했습니다: ${detail}. 해당 서비스의 크레딧·키 상태를 확인해 주세요.`);
}
