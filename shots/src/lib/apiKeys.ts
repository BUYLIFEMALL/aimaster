import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ApiKeyProvider, Database } from "@/types/database.types";

export const PROVIDER_LABELS: Record<ApiKeyProvider, string> = {
  openai: "OpenAI (GPT)",
  anthropic: "Anthropic (Claude)",
  gemini: "Google (Gemini)",
  perplexity: "Perplexity",
  suno: "Suno (배경음악)",
  json2video: "JSON2Video (최종 영상 렌더링)",
  google_client_id: "Google OAuth Client ID (유튜브 채널 연동)",
  google_client_secret: "Google OAuth Client Secret (유튜브 채널 연동)",
  meta_app_id: "Meta App ID (인스타그램 연동)",
  meta_app_secret: "Meta App Secret (인스타그램 연동)",
};

// 등록 폼(설정 페이지)에 노출할 프로바이더 목록. PROVIDER_LABELS에서 그대로 뽑아 쓰기 때문에
// 새 프로바이더 추가 시 여기 따로 안 챙겨도 자동으로 저장 허용 목록에 포함된다.
export const ALL_PROVIDERS = Object.keys(PROVIDER_LABELS) as ApiKeyProvider[];

// 설정 페이지에서 그룹으로 나눠 보여주기 위한 목록.
export const AI_PROVIDERS: ApiKeyProvider[] = ["openai", "anthropic", "gemini", "perplexity", "suno", "json2video"];

// 프로바이더별 앱 공용(기본) 키. 사용자가 본인 키를 등록하지 않았을 때만 폴백으로 쓰인다.
const FALLBACK_ENV_KEYS: Record<ApiKeyProvider, string | undefined> = {
  openai: process.env.OPENAI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  gemini: process.env.GEMINI_API_KEY,
  perplexity: process.env.PERPLEXITY_API_KEY,
  suno: process.env.SUNO_API_KEY,
  json2video: process.env.JSON2VIDEO_API_KEY,
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
  meta_app_id: process.env.META_APP_ID,
  meta_app_secret: process.env.META_APP_SECRET,
};

export async function getUserApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const { data } = await supabase
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  return data?.api_key ?? null;
}

/** 본인 키가 등록돼 있으면 그 키를, 없으면 앱 공용 키로 폴백한다. 기본적으로 본인 키를 우선한다. */
export async function resolveApiKey(
  supabase: SupabaseClient<Database>,
  userId: string,
  provider: ApiKeyProvider,
): Promise<string | null> {
  const ownKey = await getUserApiKey(supabase, userId, provider);
  return ownKey || FALLBACK_ENV_KEYS[provider] || null;
}

/**
 * 이 앱은 각 회원이 본인 API 키를 등록해서 본인 키로 생성 기능을 쓰는 것을 기본 모델로 한다.
 * 화면에서 "이 기능을 쓰려면 키를 등록하세요" 안내를 보여주기 위해, 앱 폴백 키 존재 여부와
 * 무관하게 본인이 직접 등록한 키가 있는지만 확인한다.
 */
export async function getRegisteredProviders(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Set<ApiKeyProvider>> {
  const { data } = await supabase.from("user_api_keys").select("provider").eq("user_id", userId);
  return new Set((data ?? []).map((row) => row.provider));
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 6)}${"•".repeat(8)}${key.slice(-4)}`;
}
