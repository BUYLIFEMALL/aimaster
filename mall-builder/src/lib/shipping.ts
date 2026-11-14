// 배송비 정책·계산 — 장바구니·주문서·견적이 모두 이 계산을 쓴다(docs/mall/ARCHITECTURE.md §4)
// DB: mall_builder_shipping_policies, 상품의 shipping_policy_id(없으면 몰 기본 정책)

export type ShippingType = "free" | "fixed" | "conditional" | "quantity" | "range";

export type ShippingPolicy = {
  id: string;
  name: string;
  type: ShippingType;
  base_fee: number; // 기본 배송비(원)
  free_over: number | null; // 조건부 무료 기준 금액(이상이면 무료)
  jeju_fee: number; // 제주 추가
  island_fee: number; // 도서산간 추가
  is_default: boolean;
  // 0065(2026-11-14, 스마트스토어 기준) — 없으면(옛 데이터) 기본값으로 본다
  repeat_qty?: number | null; // 수량별: ○개마다 기본 배송비
  range_upto?: number | null; // 구간별: ○개까지 기본 배송비
  range_extra_fee?: number | null; // 구간별: 넘으면 한 번 더
  bundle?: boolean | null; // false면 같은 정책이어도 상품마다 따로
  return_fee?: number | null; // 반품 배송비(편도) — 안내용
  exchange_fee?: number | null; // 교환 배송비(왕복) — 안내용
};

export type Region = "mainland" | "jeju" | "island";

/** 발송 칸 택배사 고르기 목록(직접 입력도 됨) — 2026-11-14 분양몰 검수: 회색 예시 「CJ대한통운」이 입력값처럼 보여 빈 칸으로 막힘 → 실제 기본값 + 목록 */
export const COURIERS = ["CJ대한통운", "한진택배", "롯데택배", "우체국택배", "로젠택배", "경동택배", "대신택배"] as const;
export const DEFAULT_COURIER = COURIERS[0];

export const SHIPPING_TYPE_LABEL: Record<ShippingType, string> = {
  free: "무료 배송",
  fixed: "고정 배송비",
  conditional: "조건부 무료",
  quantity: "수량별",
  range: "구간별",
};

/**
 * 우편번호(5자리)로 지역 판단. 제주 63000~63644.
 * 도서산간은 1차 기본 목록(울릉·인천 옹진 섬·전남 신안 등 대표 범위) — 택배사 목록과 다를 수 있어 운영자가 확인해야 한다.
 */
const ISLAND_RANGES: [number, number][] = [
  [40200, 40240], // 경북 울릉
  [23004, 23010], [23100, 23136], // 인천 옹진·강화 섬
  [32133, 32133], // 충남 태안 섬
  [33411, 33411], // 충남 보령 섬
  [52570, 52571], // 경남 사천 섬
  [53031, 53033], [53089, 53104], // 경남 통영 섬
  [56347, 56349], // 전북 부안 위도
  [57068, 57069], // 전남 영광 섬
  [58760, 58762], [58800, 58866], // 전남 목포·신안 섬
  [58953, 58958], // 전남 해남 섬
  [59102, 59103], [59127, 59127], [59137, 59166], // 전남 완도 섬
  [59421, 59421], [59531, 59531], [59551, 59551], [59563, 59563], [59568, 59568], // 전남 보성·고흥·여수 섬
  [59650, 59650], [59766, 59766], [59781, 59790], // 전남 여수 섬
];

export function regionOfZip(zip: string): Region {
  const n = Number(String(zip).replace(/\D/g, "").slice(0, 5));
  if (!Number.isFinite(n) || String(zip).replace(/\D/g, "").length !== 5) return "mainland";
  if (n >= 63000 && n <= 63644) return "jeju";
  if (ISLAND_RANGES.some(([a, b]) => n >= a && n <= b)) return "island";
  return "mainland";
}

/** 정책 하나에 대한 배송비 — 묶음 합계(subtotal)·묶음 수량(qty) 기준. DB 계산(0065 shipping_qty_fee)과 같아야 한다 */
export function feeForPolicy(policy: ShippingPolicy, subtotal: number, region: Region, qty = 1): number {
  let fee = 0;
  if (policy.type === "fixed") fee = policy.base_fee;
  else if (policy.type === "conditional") fee = policy.free_over != null && subtotal >= policy.free_over ? 0 : policy.base_fee;
  else if (policy.type === "quantity") fee = policy.base_fee * Math.ceil(Math.max(qty, 1) / Math.max(policy.repeat_qty ?? 1, 1));
  else if (policy.type === "range") fee = policy.base_fee + (qty > (policy.range_upto ?? 0) ? policy.range_extra_fee ?? 0 : 0);
  if (region === "jeju") fee += policy.jeju_fee;
  if (region === "island") fee += policy.island_fee;
  return fee;
}

/** qty·productId는 수량별·구간별·묶음 불가 정책 계산에 쓴다(없으면 수량 1·상품 구분 없음) */
export type ShippingLine = { policyId: string | null; amount: number; qty?: number; productId?: string | null };

/**
 * 여러 상품 줄의 배송비 합계 — 같은 정책끼리 묶어 묶음마다 한 번 매긴다.
 * 정책이 없는 상품은 몰 기본 정책, 기본 정책도 없으면 무료.
 */
export function computeShipping(lines: ShippingLine[], policies: ShippingPolicy[], region: Region = "mainland") {
  const byId = new Map(policies.map((p) => [p.id, p]));
  const fallback = policies.find((p) => p.is_default) ?? null;
  const groups = new Map<string, { policy: ShippingPolicy | null; subtotal: number; qty: number }>();
  for (const line of lines) {
    const policy = (line.policyId && byId.get(line.policyId)) || fallback;
    // 묶음 불가 정책은 상품마다 따로(DB shipping_group_key와 같은 규칙)
    const key = !policy ? "none" : policy.bundle === false ? `${policy.id}|${line.productId ?? ""}` : policy.id;
    const g = groups.get(key) ?? { policy, subtotal: 0, qty: 0 };
    g.subtotal += line.amount;
    g.qty += line.qty ?? 1;
    groups.set(key, g);
  }
  const breakdown = [...groups.values()].map((g) => ({
    policyId: g.policy?.id ?? null,
    name: g.policy?.name ?? "무료 배송",
    subtotal: g.subtotal,
    qty: g.qty,
    fee: g.policy ? feeForPolicy(g.policy, g.subtotal, region, g.qty) : 0,
  }));
  return { total: breakdown.reduce((s, b) => s + b.fee, 0), breakdown };
}

/** 상세 화면 한 줄 안내 */
export function describePolicy(p: ShippingPolicy | null): string {
  if (!p || p.type === "free") return "무료 배송";
  const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
  let base = `배송비 ${won(p.base_fee)}`;
  if (p.type === "conditional" && p.free_over != null) base += ` (${won(p.free_over)} 이상 무료)`;
  if (p.type === "quantity") base = `배송비 ${p.repeat_qty ?? 1}개마다 ${won(p.base_fee)}`;
  if (p.type === "range") base = `배송비 ${won(p.base_fee)} (${p.range_upto ?? 0}개 넘으면 +${won(p.range_extra_fee ?? 0)})`;
  const extra = p.jeju_fee || p.island_fee ? ` · 제주 +${won(p.jeju_fee)} / 도서산간 +${won(p.island_fee)}` : "";
  const each = p.bundle === false ? " · 상품마다 따로" : "";
  return base + extra + each;
}

/** 반품·교환 배송비 안내 한 줄(없으면 빈 글자) */
export function describeReturnFees(p: ShippingPolicy | null): string {
  if (!p) return "";
  const parts = [
    p.return_fee != null ? `반품 배송비(편도) ${p.return_fee.toLocaleString("ko-KR")}원` : "",
    p.exchange_fee != null ? `교환 배송비(왕복) ${p.exchange_fee.toLocaleString("ko-KR")}원` : "",
  ];
  return parts.filter(Boolean).join(" · ");
}

export function validatePolicy(input: {
  name: string; type: string; base_fee: number | null; free_over: number | null; jeju_fee: number | null; island_fee: number | null;
  repeat_qty?: number | null; range_upto?: number | null; range_extra_fee?: number | null; return_fee?: number | null; exchange_fee?: number | null;
}): string | null {
  if (input.name.trim().length < 1 || input.name.trim().length > 30) return "정책 이름은 1~30자로 입력해 주세요.";
  if (!Object.keys(SHIPPING_TYPE_LABEL).includes(input.type)) return "배송비 종류를 골라 주세요.";
  const small = [input.range_extra_fee, input.return_fee, input.exchange_fee];
  if (small.some((n) => n != null && (Number.isNaN(n) || n < 0 || n > 1_000_000))) return "추가·반품·교환 배송비는 0~1,000,000원으로 입력해 주세요.";
  const okQty = (n: number | null | undefined) => n != null && Number.isInteger(n) && n >= 1 && n <= 999;
  if (input.type === "quantity" && !okQty(input.repeat_qty)) return "수량별은 「몇 개마다」를 1~999로 입력해 주세요.";
  if (input.type === "range" && !okQty(input.range_upto)) return "구간별은 「몇 개까지」를 1~999로 입력해 주세요.";
  if (input.type === "range" && !input.range_extra_fee) return "구간별은 넘었을 때 더할 배송비를 입력해 주세요.";
  const nums = [input.base_fee, input.free_over, input.jeju_fee, input.island_fee];
  if (nums.some((n) => n != null && (Number.isNaN(n) || n < 0 || n > 1_000_000_000))) return "금액은 0 이상 숫자로 입력해 주세요.";
  if (input.type !== "free" && !input.base_fee) return "기본 배송비를 입력해 주세요.";
  if (input.type === "conditional" && !input.free_over) return "무료가 되는 기준 금액을 입력해 주세요.";
  return null;
}
