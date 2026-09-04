import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";

// 토스쇼핑 쉐어링크(Toss ShareLink) Open API 클라이언트.
//
// 이 API는 호출 서버의 고정 아웃바운드 IP를 사전 등록해야 하는데(회원마다 다른 IP가
// 아니라 이 플랫폼이 쓰는 고정 IP 1개를 모든 회원이 각자 본인 토스 어드민에 등록),
// Vercel 서버리스는 아웃바운드 IP가 고정되어 있지 않다. 그래서 Fixie(usefixie.com)로
// 고정 IP 프록시를 구축해 FIXIE_URL 환경변수(운영자 인프라, 회원별 BYOK 대상 아님)로
// Vercel에 등록해뒀다. 이 클라이언트의 모든 요청은 반드시 이 프록시를 거쳐야 한다 —
// 프록시 없이 직접 호출하면 토스 쪽에서 IP 불일치로 거부한다.
//
// Node.js 내장 fetch(Vercel 런타임)는 https-proxy-agent 같은 구식 Agent가 아니라
// undici의 dispatcher 옵션으로 프록시를 지정해야 한다(공식 undici 문서 패턴).
//
// API 근거: sharelink-docs.toss.im(2026-09-04 조사) — 별도 API 키로 실계정 검증은
// 아직 안 됨. 첫 연동 시 응답 형식이 문서와 다르면 이 파일을 공식 문서와 다시 대조할 것.

const TOKEN_URL = "https://oauth2.cert.toss.im/token";
const API_BASE = "https://sharelink.toss.im/openapi";

function getProxyAgent(): ProxyAgent {
  const fixieUrl = process.env.FIXIE_URL;
  if (!fixieUrl) {
    throw new Error("FIXIE_URL 환경변수가 설정되어 있지 않습니다. (Vercel 프로젝트 환경변수 확인 필요)");
  }
  return new ProxyAgent(fixieUrl);
}

export interface TossAuth {
  accessKey: string;
  secretKey: string;
  publisherId: string;
}

interface TossEnvelope<T> {
  resultType: "SUCCESS" | "FAIL";
  success?: T;
  error?: { errorType: number; errorCode: string; reason: string };
}

let cachedToken: { accessKey: string; token: string; expiresAt: number } | null = null;

/** OAuth2 client_credentials 토큰 발급. 같은 서버리스 인스턴스가 재사용되는 동안은
 * 메모리에 캐시해 재발급을 줄인다(만료 60초 전에 미리 갱신). */
async function getAccessToken(auth: Pick<TossAuth, "accessKey" | "secretKey">): Promise<string> {
  if (cachedToken && cachedToken.accessKey === auth.accessKey && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: auth.accessKey,
    client_secret: auth.secretKey,
    scope: "sharelink:read sharelink:write",
  });

  const response = await undiciFetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    dispatcher: getProxyAgent(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`토스 쉐어링크 토큰 발급에 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessKey: auth.accessKey, token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

async function callApi<T>(
  auth: Pick<TossAuth, "accessKey" | "secretKey">,
  path: string,
  init?: { method?: "GET" | "POST"; body?: unknown },
): Promise<T> {
  const token = await getAccessToken(auth);

  const response = await undiciFetch(`${API_BASE}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    dispatcher: getProxyAgent(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`토스 쉐어링크 API 호출에 실패했습니다. (${response.status}) ${text.slice(0, 300)}`);
  }

  const data = (await response.json()) as TossEnvelope<T>;
  if (data.resultType !== "SUCCESS" || !data.success) {
    throw new Error(`토스 쉐어링크 응답 오류: ${data.error?.reason ?? data.error?.errorCode ?? "알 수 없는 오류"}`);
  }
  return data.success;
}

export interface TossProduct {
  tacaId: number;
  tacaItemId: number | null;
  productName: string;
  imageUrl: string | null;
  price: number | null;
  productUrl: string | null;
}

function normalizeTossProduct(raw: Record<string, unknown>): TossProduct {
  return {
    tacaId: Number(raw.tacaId),
    tacaItemId: raw.tacaItemId != null ? Number(raw.tacaItemId) : null,
    productName: String(raw.productName ?? raw.name ?? ""),
    imageUrl: (raw.mainImageUrl as string) ?? (raw.imageUrl as string) ?? null,
    price: raw.price != null ? Number(raw.price) : null,
    productUrl: (raw.productUrl as string) ?? null,
  };
}

/** 베스트 상품 조회 (1시간 단위 배치 갱신 — 문서 권장대로 결과를 잠깐 캐시해서 재사용할 것). */
export async function getBestSelling(
  auth: Pick<TossAuth, "accessKey" | "secretKey">,
  params: { cursor?: string; size?: number } = {},
): Promise<{ products: TossProduct[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("size", String(params.size ?? 30));

  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null }>(
    auth,
    `/products/best-selling?${qs.toString()}`,
  );
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null };
}

export interface TossCategory {
  categoryId: string;
  name: string;
}

/** 카테고리 목록. 자주 안 바뀌므로(문서 권장) 호출부에서 하루 정도 캐시해서 재사용할 것. */
export async function getCategories(auth: Pick<TossAuth, "accessKey" | "secretKey">): Promise<TossCategory[]> {
  const data = await callApi<{ categories?: Record<string, unknown>[] }>(auth, "/categories");
  return (data.categories ?? []).map((c) => ({ categoryId: String(c.categoryId), name: String(c.name) }));
}

/** 특정 카테고리 안의 베스트 상품. */
export async function getCategoryBestSelling(
  auth: Pick<TossAuth, "accessKey" | "secretKey">,
  categoryId: string,
  params: { cursor?: string; size?: number } = {},
): Promise<{ products: TossProduct[]; nextCursor: string | null }> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("size", String(params.size ?? 30));

  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null }>(
    auth,
    `/products/best-categories/${encodeURIComponent(categoryId)}?${qs.toString()}`,
  );
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null };
}

/** 오늘의 특가 상품. 응답의 endAt(종료 시각)을 넘기지 않는 선에서만 캐시할 것(문서 권장). */
export async function getTodayDeals(
  auth: Pick<TossAuth, "accessKey" | "secretKey">,
  params: { cursor?: string; size?: number } = {},
): Promise<{ products: TossProduct[]; nextCursor: string | null; endAt: string | null }> {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  qs.set("size", String(params.size ?? 30));

  const data = await callApi<{ items?: Record<string, unknown>[]; nextCursor?: string | null; endAt?: string }>(
    auth,
    `/products/today-deals?${qs.toString()}`,
  );
  return { products: (data.items ?? []).map(normalizeTossProduct), nextCursor: data.nextCursor ?? null, endAt: data.endAt ?? null };
}

export interface TossShareLink {
  tacaItemId: number | null;
  publisherId: string;
  shortUrl: string;
  originUrl: string;
}

/**
 * 쉐어링크(제휴 추적 링크) 발급. tacaItemId 또는 tacaId 중 최소 하나가 필요하다
 * (tacaItemId가 있으면 우선). subTagId를 넘기면 하위 채널(이 경우 우리 회원 단위)별로
 * 실적을 분리 추적할 수 있다 — 필요해지면 회원 user_id를 subTagId로 등록해서 쓰면 된다.
 */
export async function issueShareLink(
  auth: TossAuth,
  params: { tacaItemId?: number; tacaId?: number; subTagId?: string },
): Promise<TossShareLink> {
  if (params.tacaItemId == null && params.tacaId == null) {
    throw new Error("tacaItemId 또는 tacaId 중 하나는 반드시 필요합니다.");
  }

  const data = await callApi<{ tacaItemId: number | null; publisherId: string; shortUrl: string; originUrl: string }>(
    auth,
    "/links",
    {
      method: "POST",
      body: {
        publisherId: auth.publisherId,
        ...(params.tacaItemId != null ? { tacaItemId: params.tacaItemId } : {}),
        ...(params.tacaId != null ? { tacaId: params.tacaId } : {}),
        ...(params.subTagId ? { subTagId: params.subTagId } : {}),
      },
    },
  );

  return data;
}
