import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";

// 토스쇼핑 쉐어링크(Toss ShareLink) Open API 클라이언트 — threads-affiliate-poster/src/lib/toss/client.ts를 이 프로그램으로 옮긴 것이다(v1.80).
//
// 이 API는 호출 서버의 고정 아웃바운드 IP를 토스 어드민에 등록해야 한다. Vercel 서버리스는 IP가 고정이 아니므로
// Fixie(usefixie.com) 고정 IP 프록시를 FIXIE_URL 환경변수(운영자 인프라, 회원별 키 대상 아님)로 거쳐야 한다.
// 토큰 발급·API 호출 모두 이 프록시를 통한다. Access/Secret/Publisher ID는 회원 본인 키(user_api_keys)만 쓴다.
// 응답 필드명은 poster에서 실계정 호출로 확인한 값(displayName/thumbnailUrl/displayPrice)을 그대로 따른다.

const TOKEN_URL = "https://oauth2.cert.toss.im/token";
const API_BASE = "https://sharelink.toss.im/openapi";

export const TOSS_PROXY_MISSING_MESSAGE = "토스쇼핑 연동용 고정 IP 프록시(FIXIE_URL)가 이 서버에 아직 설정되지 않았습니다. 운영자가 설정하면 사용할 수 있습니다.";

export function isTossProxyConfigured(): boolean {
  return Boolean(process.env.FIXIE_URL);
}

function getProxyAgent(): ProxyAgent {
  const fixieUrl = process.env.FIXIE_URL;
  if (!fixieUrl) throw new Error(TOSS_PROXY_MISSING_MESSAGE);
  return new ProxyAgent(fixieUrl);
}

export type TossAuth = { accessKey: string; secretKey: string; publisherId: string };
type TossKeys = Pick<TossAuth, "accessKey" | "secretKey">;

type TossEnvelope<T> = {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorType: number; errorCode: string; reason: string };
};

let cachedToken: { accessKey: string; token: string; expiresAt: number } | null = null;

/** OAuth2 client_credentials 토큰. 같은 서버 인스턴스가 재사용되는 동안은 메모리에 캐시한다(만료 60초 전 갱신). */
async function getAccessToken(auth: TossKeys): Promise<string> {
  if (cachedToken && cachedToken.accessKey === auth.accessKey && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.token;

  const response = await undiciFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: auth.accessKey, client_secret: auth.secretKey, scope: "sharelink:read sharelink:write" }).toString(),
    dispatcher: getProxyAgent(),
  });
  if (!response.ok) throw new Error(`토스 쉐어링크 토큰 발급에 실패했습니다. (${response.status}) Access Key·Secret Key와 등록된 서버 IP를 확인해 주세요.`);

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessKey: auth.accessKey, token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function callApi<T>(auth: TossKeys, path: string, init?: { method?: "GET" | "POST"; body?: unknown }): Promise<T> {
  const token = await getAccessToken(auth);
  const response = await undiciFetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${token}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    dispatcher: getProxyAgent(),
  });
  if (!response.ok) throw new Error(`토스 쉐어링크 API 호출에 실패했습니다. (${response.status})`);

  const data = (await response.json()) as TossEnvelope<T>;
  if (data.resultType !== "SUCCESS" || !data.success) throw new Error(`토스 쉐어링크 응답 오류: ${data.error?.reason ?? data.error?.errorCode ?? "알 수 없는 오류"}`);
  return data.success;
}

export type TossProduct = {
  tacaId: number | null;
  tacaItemId: number | null;
  productName: string;
  imageUrl: string | null;
  price: number | null;
  productUrl: string | null;
};

function normalizeTossProduct(raw: Record<string, unknown>): TossProduct {
  const tacaId = raw.tacaId != null ? Number(raw.tacaId) : NaN;
  return {
    tacaId: Number.isFinite(tacaId) ? tacaId : null,
    tacaItemId: raw.tacaItemId != null ? Number(raw.tacaItemId) : null,
    productName: String(raw.displayName ?? raw.productName ?? raw.name ?? ""),
    imageUrl: (raw.thumbnailUrl as string) ?? (raw.mainImageUrl as string) ?? (raw.imageUrl as string) ?? null,
    price: raw.displayPrice != null ? Number(raw.displayPrice) : raw.price != null ? Number(raw.price) : null,
    productUrl: (raw.productUrl as string) ?? null,
  };
}

type ProductList = { items?: Record<string, unknown>[] };

export async function getTossBestSelling(auth: TossKeys, size = 30): Promise<TossProduct[]> {
  const data = await callApi<ProductList>(auth, `/products/best-selling?size=${size}`);
  return (data.items ?? []).map(normalizeTossProduct);
}

export async function getTossTodayDeals(auth: TossKeys, size = 30): Promise<TossProduct[]> {
  const data = await callApi<ProductList>(auth, `/products/today-deals?size=${size}`);
  return (data.items ?? []).map(normalizeTossProduct);
}

export async function getTossCategoryBestSelling(auth: TossKeys, categoryId: string, size = 30): Promise<TossProduct[]> {
  const data = await callApi<ProductList>(auth, `/products/best-categories/${encodeURIComponent(categoryId)}?size=${size}`);
  return (data.items ?? []).map(normalizeTossProduct);
}

export type TossCategory = { categoryId: string; name: string };

/** 카테고리 목록(대분류). 실제 응답 필드명은 displayName이다. */
export async function getTossCategories(auth: TossKeys): Promise<TossCategory[]> {
  const data = await callApi<{ categories?: Record<string, unknown>[] }>(auth, "/categories");
  return (data.categories ?? []).map((category) => ({ categoryId: String(category.categoryId), name: String(category.displayName ?? category.name ?? "") }));
}

export type TossShareLink = { shortUrl: string; originUrl: string };

/**
 * 쉐어링크(제휴 추적 링크) 발급. tacaItemId 또는 tacaId가 필요하다.
 * subTagId는 보내지 않는다 — 사전 등록(sub-tags/create)된 값만 허용되고, 임의 값은 SHARELINK_OPENAPI_ACCESS_DENIED로 거부된다.
 */
export async function issueTossShareLink(auth: TossAuth, params: { tacaItemId?: number | null; tacaId?: number | null }): Promise<TossShareLink> {
  if (params.tacaItemId == null && params.tacaId == null) throw new Error("상품 식별 번호가 없습니다. 목록에서 다시 선택해 주세요.");
  const data = await callApi<{ shortUrl: string; originUrl: string }>(auth, "/links", {
    method: "POST",
    body: {
      publisherId: auth.publisherId,
      ...(params.tacaItemId != null ? { tacaItemId: params.tacaItemId } : {}),
      ...(params.tacaItemId == null && params.tacaId != null ? { tacaId: params.tacaId } : {}),
    },
  });
  return { shortUrl: data.shortUrl, originUrl: data.originUrl };
}
