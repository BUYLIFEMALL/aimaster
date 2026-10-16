import "server-only";
import { getUserApiKeys } from "@/lib/apiKeys";
import { loadSettings } from "@/lib/store";
import { PROVIDER_LABEL } from "@/lib/models";
import { UserError } from "@/lib/errors";
import type { AiConfig } from "@/lib/ai";

/** 회원이 고른 공급사·모델 + 그 공급사의 본인 키. 키가 없으면 등록 안내(폴백 없음 — 최상위 규칙) */
export async function aiConfig(userId: string): Promise<AiConfig> {
  const s = await loadSettings(userId);
  const key = (await getUserApiKeys(userId, [s.provider]))[s.provider];
  if (!key) throw new UserError(400, `${PROVIDER_LABEL[s.provider]} API 키가 없습니다. API키등록·플랫폼연동에서 본인 키를 등록하거나 다른 AI를 골라 주세요.`, { needKey: true });
  return { provider: s.provider, model: s.model, apiKey: key };
}
