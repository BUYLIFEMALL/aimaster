import "server-only";
import { getUserApiKeys } from "@/lib/apiKeys";
import type { AiConfig } from "@/lib/ai";
import type { AdsAuth, NaverAuth } from "@/lib/naver";
import { UserError } from "@/lib/errors";
import { getSettings } from "@/lib/store";
import { DEFAULT_IMAGE_MODEL, DEFAULT_MODEL, isImageModel, isTextModel } from "@/lib/models";
import type { Settings } from "@/lib/types";

// 회원 본인 설정·키 조회(권한 확인은 route.ts의 guard가 먼저 한다). next 모듈을 쓰지 않아 단계 처리·시험에서 바로 쓸 수 있다.
export async function loadSettings(userId: string): Promise<Settings> {
  const s = (await getSettings<Settings>(userId))?.data;
  const provider = s?.provider === "openai" || s?.provider === "gemini" ? s.provider : "gemini";
  return {
    provider,
    model: s && isTextModel(provider, s.model) ? s.model : DEFAULT_MODEL[provider],
    imageModel: s && isImageModel(s.imageModel) ? s.imageModel : DEFAULT_IMAGE_MODEL,
  };
}

/** 본인 AI 키(설정에서 고른 공급사). 없으면 등록 안내 */
export async function aiConfig(userId: string): Promise<AiConfig> {
  const s = await loadSettings(userId);
  const key = (await getUserApiKeys(userId, [s.provider]))[s.provider];
  if (!key) throw new UserError(400, `본인 ${s.provider === "openai" ? "OpenAI" : "Gemini"} API 키를 [API키등록·플랫폼연동]에서 등록해 주세요.`, { needKey: true });
  return { provider: s.provider, model: s.model, apiKey: key };
}

export async function geminiImageConfig(userId: string): Promise<{ apiKey: string; model: string }> {
  const s = await loadSettings(userId);
  const key = (await getUserApiKeys(userId, ["gemini"])).gemini;
  if (!key) throw new UserError(400, "이미지 제작에는 본인 Gemini API 키가 필요합니다. [API키등록·플랫폼연동]에서 등록해 주세요.", { needKey: true });
  return { apiKey: key, model: s.imageModel };
}

export async function naverAuth(userId: string): Promise<NaverAuth> {
  const k = await getUserApiKeys(userId, ["naver_client_id", "naver_client_secret"]);
  if (!k.naver_client_id || !k.naver_client_secret) throw new UserError(400, "본인 네이버 검색 API(Client ID·Secret)를 [API키등록·플랫폼연동]에서 등록해 주세요.", { needKey: true });
  return { clientId: k.naver_client_id, clientSecret: k.naver_client_secret };
}

export async function adsAuth(userId: string): Promise<AdsAuth> {
  const k = await getUserApiKeys(userId, ["naver_ads_api_key", "naver_ads_secret_key", "naver_ads_customer_id"]);
  if (!k.naver_ads_api_key || !k.naver_ads_secret_key || !k.naver_ads_customer_id) throw new UserError(400, "본인 네이버 검색광고 API(라이선스·비밀키·고객 ID)를 [API키등록·플랫폼연동]에서 등록해 주세요.", { needKey: true });
  return { apiKey: k.naver_ads_api_key, secretKey: k.naver_ads_secret_key, customerId: k.naver_ads_customer_id };
}
