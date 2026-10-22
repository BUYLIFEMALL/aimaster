import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";

// 공용 기준 코드 `affiliate-clients` — 토스쇼핑 쉐어링크(Toss ShareLink) Open API.
// 기준: threads-affiliate-poster/src/lib/affiliate-clients/ · 사본: threads-content-ops/lib/affiliate-clients/ (사본 직접 수정 금지, --sync)
//
// 이 API는 호출 서버의 고정 아웃바운드 IP를 토스 어드민에 등록해야 한다. Vercel 서버리스는 IP가 고정이 아니라
// Fixie(usefixie.com) 고정 IP 프록시를 FIXIE_URL 환경변수(운영자 인프라, 회원별 키 대상 아님)로 거친다 — 토큰·API 모두.
// Node 내장 fetch는 undici의 dispatcher 옵션으로 프록시를 지정한다. Access/Secret/Publisher ID는 회원 본인 키만 쓴다(호출부).
// 응답 필드명은 2026-09-10 실계정 호출로 확인한 값(displayName/thumbnailUrl/displayPrice). 목록 응답에는 tacaId가 없고 tacaItemId만 온다.

const TOKEN_URL = "https://oauth2.cert.toss.im/token";
const API_BASE = "https://sharelink.toss.im/openapi";

export const TOSS_PROXY_MISSING_MESSAGE = "토스쇼핑 연동용 고정 IP 프록시(FIXIE_URL)가 이 서버에 아직 설정되지 않았습니다. 운영자가 설정하면 사용할 수 있습니다.";

// 환경변수 값 앞뒤에 공백이 섞여 저장돼도 동작하도록 항상 trim해서 읽는다.
function proxyUrl(): string {
  return (process.env.FIXIE_URL ?? "").trim();
}

export function isTossProxyConfigured(): boolean {
  return Boolean(proxyUrl());
}

function getProxyAgent(): ProxyAgent {
  const fixieUrl = proxyUrl();
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

export function normalizeTossProduct(raw: Record<string, unknown>): TossProduct {
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

type PageParams = { cursor?: string; size?: number };
type ProductPage = { products: TossProduct[]; nextCursor: string | null };

function pageQuery(params: PageParams): string {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("size", String(params.size ?? 30));
  return qs.toString();
}

/** 베스트 상품(1시간 단위 배치 갱신 — 결과를 잠깐 캐시해 재사용할 것). */
export async function getBestSelling(auth: TossKeys, params: PageParams = {}): Promise<ProductPage> {
  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null }>(auth, `/products/best-selling?${pageQuery(params)}`);
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null };
}

/** 특정 카테고리 안의 베스트 상품. */
export async function getCategoryBestSelling(auth: TossKeys, categoryId: string, params: PageParams = {}): Promise<ProductPage> {
  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null }>(auth, `/products/best-categories/${encodeURIComponent(categoryId)}?${pageQuery(params)}`);
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null };
}

/** 오늘의 특가. 응답의 endAt(종료 시각)을 넘기지 않는 선에서만 캐시할 것. */
export async function getTodayDeals(auth: TossKeys, params: PageParams = {}): Promise<ProductPage & { endAt: string | null }> {
  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null; endAt?: string }>(auth, `/products/today-deals?${pageQuery(params)}`);
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null, endAt: data.endAt ?? null };
}

export type TossCategory = { categoryId: string; name: string };

/** 카테고리 목록(대분류). 실제 응답 필드명은 displayName이다(2026-09-10 확인). 자주 안 바뀌어 하루 정도 캐시해도 된다. */
export async function getCategories(auth: TossKeys): Promise<TossCategory[]> {
  const data = await callApi<{ categories?: Record<string, unknown>[] }>(auth, "/categories");
  return (data.categories ?? []).map((category) => ({ categoryId: String(category.categoryId), name: String(category.displayName ?? category.name ?? "") }));
}

export type TossShareLink = { shortUrl: string; originUrl: string };

/**
 * 쉐어링크(제휴 추적 링크) 발급. tacaItemId(우선) 또는 tacaId가 필요하다.
 * subTagId는 보내지 않는다 — 사전 등록(sub-tags/create)된 값만 허용되고 임의 값은 SHARELINK_OPENAPI_ACCESS_DENIED로 거부된다(2026-09-10 확인).
 */
export async function issueShareLink(auth: TossAuth, params: { tacaItemId?: number | null; tacaId?: number | null }): Promise<TossShareLink> {
  const tacaItemId = Number.isFinite(params.tacaItemId) ? params.tacaItemId : null;
  const tacaId = Number.isFinite(params.tacaId) ? params.tacaId : null;
  if (tacaItemId == null && tacaId == null) throw new Error("상품 식별 번호가 없습니다. 목록에서 다시 선택해 주세요.");
  const data = await callApi<{ shortUrl: string; originUrl: string }>(auth, "/links", {
    method: "POST",
    body: { publisherId: auth.publisherId, ...(tacaItemId != null ? { tacaItemId } : { tacaId }) },
  });
  return { shortUrl: data.shortUrl, originUrl: data.originUrl };
}
