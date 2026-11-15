// 공용 기준 코드 `shop-flow` — 기준: shop-order-report/src/lib/shopFlow.ts (여기만 고치고 `node scripts/check-shared-modules.mjs --module shop-flow --sync`).
// 사본: seller-label-docs/src/lib/shopFlow.ts · trending-product-finder/lib/shopFlow.ts. 다른 앱에서도 돌도록 아무것도 import하지 않는다.
// 쇼핑몰 흐름(D7): 각 프로그램은 단독으로 끝까지 쓰고, 「?flow=shop」으로 들어왔을 때만 흐름 띠를 보여 준다(그 탭 안에서만 기억).

export const FLOW_PARAM = "flow";
export const FLOW_VALUE = "shop";
export const FLOW_SESSION_KEY = "aimaster-shop-flow";

export type FlowStepId = "sourcing" | "detail" | "market" | "orders" | "label";

export interface FlowStep {
  id: FlowStepId;
  emoji: string;
  label: string;
  url: string;
}

export const FLOW_STEPS: FlowStep[] = [
  { id: "sourcing", emoji: "🔎", label: "상품 소싱", url: "https://trending-product-finder.buylife.xyz/sourcing" },
  { id: "detail", emoji: "📄", label: "상세페이지", url: "https://shop-detail-page.buylife.xyz/products/new" },
  // 마켓 등록 — 지금은 스마트스토어(이후 쿠팡·11번가·G마켓·옥션 등록기가 생기면 이 단계에서 고름, 2026-10-27)
  { id: "market", emoji: "🛒", label: "마켓 등록", url: "https://smartstore-register.buylife.xyz/products" },
  { id: "orders", emoji: "📊", label: "주문·매출 리포트", url: "https://shop-order-report.buylife.xyz/upload" },
  { id: "label", emoji: "🏷", label: "발송 라벨", url: "https://seller-label-docs.buylife.xyz/label" },
];

/** 주소에 흐름 표시를 붙인다(# 뒤 부분은 그대로). */
export function withFlow(url: string): string {
  const [base, hash] = url.split("#");
  const sep = base.includes("?") ? "&" : "?";
  const marked = new RegExp(`[?&]${FLOW_PARAM}=${FLOW_VALUE}(&|$)`).test(base) ? base : `${base}${sep}${FLOW_PARAM}=${FLOW_VALUE}`;
  return hash != null ? `${marked}#${hash}` : marked;
}

/** location.search에 흐름 표시가 있는지 */
export function isFlowSearch(search: string): boolean {
  return new URLSearchParams(search).get(FLOW_PARAM) === FLOW_VALUE;
}

export function flowNeighbors(id: FlowStepId): { prev: FlowStep | null; next: FlowStep | null; index: number } {
  const index = FLOW_STEPS.findIndex((s) => s.id === id);
  return { prev: FLOW_STEPS[index - 1] ?? null, next: FLOW_STEPS[index + 1] ?? null, index };
}

// ── 주문 리포트 → 셀러 라벨: 표를 주소 「#import=」로 넘긴다(서버를 거치지 않음, 서버 기록에 남지 않음) ──

export const IMPORT_HASH_KEY = "import";
export const MAX_IMPORT_ROWS = 300;

export interface ImportTable {
  /** 받는 쪽 화면에 보일 출처 이름 */
  from: string;
  headers: string[];
  rows: string[][];
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(b64: string): string {
  const s = b64.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(s + "=".repeat((4 - (s.length % 4)) % 4));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** 표를 주소 조각으로. 줄이 너무 많으면 null(엑셀로 받아 올리도록 안내). */
export function encodeImport(table: ImportTable): string | null {
  if (table.rows.length === 0 || table.rows.length > MAX_IMPORT_ROWS) return null;
  return toBase64Url(JSON.stringify({ v: 1, f: table.from.slice(0, 60), h: table.headers.slice(0, 20), r: table.rows }));
}

/** location.hash에서 표를 읽는다. 없거나 깨졌으면 null. */
export function decodeImport(hash: string): ImportTable | null {
  const m = new RegExp(`(?:^#|&)${IMPORT_HASH_KEY}=([A-Za-z0-9_-]+)`).exec(hash);
  if (!m) return null;
  try {
    const o = JSON.parse(fromBase64Url(m[1])) as { v?: number; f?: unknown; h?: unknown; r?: unknown };
    if (o.v !== 1 || !Array.isArray(o.h) || !Array.isArray(o.r)) return null;
    const headers = o.h.map((x) => String(x ?? "")).slice(0, 20);
    const rows = o.r
      .filter((row): row is unknown[] => Array.isArray(row))
      .slice(0, MAX_IMPORT_ROWS)
      .map((row) => headers.map((_, i) => String(row[i] ?? "")));
    return { from: String(o.f ?? "다른 프로그램"), headers, rows };
  } catch {
    return null;
  }
}

/** 셀러 라벨 화면 주소(표를 실어 보냄). 흐름 중이면 흐름 표시도 붙인다. */
export function labelImportUrl(table: ImportTable, inFlow: boolean): string | null {
  const enc = encodeImport(table);
  if (!enc) return null;
  const base = FLOW_STEPS.find((s) => s.id === "label")!.url;
  return `${inFlow ? withFlow(base) : base}#${IMPORT_HASH_KEY}=${enc}`;
}
