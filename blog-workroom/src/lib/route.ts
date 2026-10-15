import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKeys } from "@/lib/apiKeys";
import { AiError, type AiConfig } from "@/lib/ai";
import { NaverError, type AdsAuth, type NaverAuth } from "@/lib/naver";
import { UserError } from "@/lib/errors";
import { getSettings } from "@/lib/store";
import { DEFAULT_IMAGE_MODEL, DEFAULT_MODEL, isImageModel, isTextModel } from "@/lib/models";
import type { Settings } from "@/lib/types";

const NO_STORE = { "Cache-Control": "private, no-store" };
export function json(body: unknown, status = 200) { return NextResponse.json(body, { status, headers: NO_STORE }); }

export function fail(e: unknown) {
  if (e instanceof UserError) return json({ error: e.message, ...e.extra }, e.status);
  if (e instanceof AiError) return json({ error: e.message, code: e.code, needKey: e.code === "key" }, e.status);
  if (e instanceof NaverError) return json({ error: e.message, code: e.code, needKey: e.code === "auth" }, e.status);
  console.error("[blog-workroom]", e instanceof Error ? e.message : "unknown");
  return json({ error: "처리 중 오류가 발생했습니다. 저장된 단계부터 다시 시도해 주세요." }, 500);
}

/** 권한 확인 + 같은 출처 + JSON 본문(크기 제한) */
export async function guard(request: NextRequest, maxBytes = 2_000_000): Promise<{ userId: string; body: Record<string, unknown> } | NextResponse> {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  if (request.method !== "GET") {
    if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "요청 출처를 확인할 수 없습니다." }, 403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return json({ error: "JSON 요청만 사용할 수 있습니다." }, 400);
  }
  let body: Record<string, unknown> = {};
  if (request.method !== "GET" && request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const p = await reader.read(); if (p.done) break;
      size += p.value.length;
      if (size > maxBytes) { await reader.cancel(); return json({ error: "요청 내용이 너무 큽니다. 이미지 수나 크기를 줄여 주세요." }, 413); }
      chunks.push(p.value);
    }
    try { const v = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"); if (v && typeof v === "object" && !Array.isArray(v)) body = v; } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  }
  return { userId: access.user.id, body };
}

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
