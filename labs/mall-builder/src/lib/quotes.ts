// 견적 — DB: mall_builder_quotes, mall_builder_quote_items (0013_quotes.sql)
// 흐름: 손님 요청(requested) → 운영자 회신(answered, 품목별 견적가·유효기한) → 손님 수락(accepted, 견적가 그대로 주문) / 거절(rejected)
// 유효기한이 지난 회신 견적은 화면에서 「기한 지남」으로 보이고 수락 함수가 거절한다(상태 칸은 바꾸지 않음)

export type QuoteStatus = "requested" | "answered" | "accepted" | "rejected";

export const QUOTE_STATUS_LABEL: Record<QuoteStatus | "expired", string> = {
  requested: "견적 요청",
  answered: "회신 도착",
  accepted: "주문 전환",
  rejected: "거절",
  expired: "기한 지남",
};

/** 한국 날짜(YYYY-MM-DD) */
export function todayKst(now = new Date()): string {
  return new Date(now.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

/** 화면에 보일 상태 — 회신했지만 유효기한(그날까지 유효)이 지났으면 「기한 지남」 */
export function displayStatus(status: QuoteStatus, validUntil: string | null, today = todayKst()): QuoteStatus | "expired" {
  if (status === "answered" && validUntil && validUntil < today) return "expired";
  return status;
}

/** 운영자 회신 검사 — 품목마다 견적가(0원 이상 정수), 유효기한은 오늘 이후 90일 이내 */
export function validateAnswer(
  items: { id: string; price: unknown }[],
  validUntil: string,
  today = todayKst(),
): { ok: true; value: { items: { id: string; price: number }[]; valid_until: string } } | { ok: false; error: string } {
  if (!items.length) return { ok: false, error: "견적 품목이 없습니다." };
  const out: { id: string; price: number }[] = [];
  for (const it of items) {
    const s = String(it.price ?? "").replace(/[,\s원]/g, "");
    if (!/^\d+$/.test(s) || Number(s) > 1_000_000_000) return { ok: false, error: "품목마다 견적가(원)를 숫자로 입력해 주세요." };
    out.push({ id: it.id, price: Number(s) });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return { ok: false, error: "유효기한을 골라 주세요." };
  if (validUntil < today) return { ok: false, error: "유효기한은 오늘 이후로 정해 주세요." };
  const max = new Date(`${today}T00:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 90);
  if (validUntil > max.toISOString().slice(0, 10)) return { ok: false, error: "유효기한은 90일 이내로 정해 주세요." };
  return { ok: true, value: { items: out, valid_until: validUntil } };
}

/** 오늘부터 N일 뒤(기본 유효기한 7일) */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
