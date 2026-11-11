// 재입고 알림(D16) — 화면 공통 표시 계산
export const RESTOCK_STATUS_LABEL: Record<string, string> = {
  waiting: "대기",
  notified: "알림 보냄",
  cancelled: "취소",
  expired: "만료",
};

export type RestockRow = {
  id: string;
  product_id: string;
  variant_id: string | null;
  phone: string;
  status: string;
  created_at: string;
  ended_at: string | null;
  product: { name: string } | null;
  variant: { values: string[] } | null;
};

export const RESTOCK_SELECT =
  "id, product_id, variant_id, phone, status, created_at, ended_at, product:mall_builder_products(name), variant:mall_builder_product_variants(values)";

/** 상품명 / 옵션1 / 옵션2 */
export function restockLabel(r: Pick<RestockRow, "product" | "variant">): string {
  const name = r.product?.name ?? "(지운 상품)";
  const opts = r.variant?.values ?? [];
  return opts.length ? `${name} / ${opts.join(" / ")}` : name;
}

/** 상품(옵션)별 대기 인원 — 많은 순 */
export function groupWaiting(rows: RestockRow[]): { key: string; productId: string; label: string; count: number }[] {
  const map = new Map<string, { key: string; productId: string; label: string; count: number }>();
  for (const r of rows) {
    if (r.status !== "waiting") continue;
    const key = `${r.product_id}:${r.variant_id ?? ""}`;
    const g = map.get(key) ?? { key, productId: r.product_id, label: restockLabel(r), count: 0 };
    g.count += 1;
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, "ko"));
}
