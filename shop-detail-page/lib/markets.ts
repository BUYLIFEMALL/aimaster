// 이커머스 한 흐름 5단계 「마켓 등록」 목록 — 마켓 등록기가 하나 생길 때마다 여기에 한 줄 추가한다
// (2026-10-27 주인님: 「일단 스마트스토어 기준」 → 이후 쿠팡·11번가·G마켓·옥션).
// 프로그램끼리 서로 호출하지 않고, 등록 화면 주소(버튼)와 같은 DB의 회원 본인 작업 기록으로만 잇는다.

export interface MarketTarget {
  id: string;
  name: string;
  emoji: string;
  /** 그 상품이 골라진 등록 화면 */
  registerUrl: (productId: string) => string;
  /** 회원 본인 등록 작업 기록 표(같은 공용 DB, RLS 본인 행만) */
  jobsTable: "smartstore_register_jobs" | "coupang_ops_jobs";
}

export const MARKETS: MarketTarget[] = [
  {
    id: "smartstore",
    name: "스마트스토어",
    emoji: "🟢",
    registerUrl: (productId) =>
      `https://smartstore-register.buylife.xyz/products/${encodeURIComponent(productId)}?flow=shop`,
    jobsTable: "smartstore_register_jobs",
  },
  {
    id: "coupang",
    name: "쿠팡",
    emoji: "🔴",
    registerUrl: (productId) => `https://coupang-ops.buylife.xyz/products/${encodeURIComponent(productId)}`,
    jobsTable: "coupang_ops_jobs",
  },
];

/** 쿠팡 기록 상태 → 화면 결과. 쿠팡에서 지운 기록은 failed라 여기 오지 않는다 */
export function pickCoupangResult(
  jobs: { status: string; seller_product_id: number | null; updated_at: string }[],
): MarketResult | null {
  const job = jobs[0];
  const status = ({ approved: "registered", saved: "temp_saved", requested: "requested", rejected: "rejected" } as const)[job?.status as "approved"];
  if (!status) return null;
  return { marketId: "coupang", status, marketProductNo: job.seller_product_id ? String(job.seller_product_id) : null, at: job.updated_at };
}

export const MARKET_STATUS_LABEL: Record<MarketResult["status"], { text: string; cls: string }> = {
  registered: { text: "등록됨", cls: "bg-emerald-50 text-emerald-700" },
  temp_saved: { text: "임시저장됨", cls: "bg-amber-50 text-amber-700" },
  requested: { text: "승인 심사 중", cls: "bg-sky-50 text-sky-700" },
  rejected: { text: "반려됨", cls: "bg-rose-50 text-rose-700" },
};

export interface MarketResult {
  marketId: string;
  status: "registered" | "temp_saved" | "requested" | "rejected";
  marketProductNo: string | null;
  at: string;
}

/** 작업 기록(최신순)에서 마켓별로 보여 줄 결과 1건 — 등록됨이 있으면 그것, 없으면 임시저장됨. */
export function pickMarketResult(
  marketId: string,
  jobs: { status: string; market_product_no: string | null; updated_at: string }[],
): MarketResult | null {
  const registered = jobs.find((j) => j.status === "registered");
  const picked = registered ?? jobs.find((j) => j.status === "temp_saved");
  if (!picked) return null;
  return {
    marketId,
    status: picked.status as MarketResult["status"],
    marketProductNo: picked.market_product_no,
    at: picked.updated_at,
  };
}
