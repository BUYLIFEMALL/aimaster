// 카드 결제(토스페이먼츠 결제위젯) — 화면·서버가 함께 쓰는 순수 계산(DB 0028과 같은 기준)
// 플랜: docs/PLAN_20261105_CARD_PAYMENT.md. 시크릿 키는 화면·앱 서버로 오지 않고 DB 함수만 쓴다.

export type KeyMode = "test" | "live";

/** 결제위젯 클라이언트 키(test_gck_/live_gck_) — 비우면 허용 */
export function checkClientKey(key: string): string | null {
  const k = key.trim();
  if (k === "") return null;
  return /^(test|live)_gck_[A-Za-z0-9_]{6,100}$/.test(k) ? null : "클라이언트 키는 결제위젯 키(test_gck_ 또는 live_gck_로 시작)를 넣어 주세요.";
}

/** 결제위젯 시크릿 키(test_gsk_/live_gsk_) — 비우면 「그대로 둠」 */
export function checkSecretKey(key: string): string | null {
  const k = key.trim();
  if (k === "") return null;
  return /^(test|live)_gsk_[A-Za-z0-9_]{6,100}$/.test(k) ? null : "시크릿 키는 결제위젯 시크릿 키(test_gsk_ 또는 live_gsk_로 시작)를 넣어 주세요.";
}

export function keyMode(key: string): KeyMode | null {
  const m = /^(test|live)_/.exec(key.trim());
  return m ? (m[1] as KeyMode) : null;
}

export const MODE_LABEL: Record<KeyMode, string> = { test: "테스트(실제 돈 안 나감)", live: "실제 결제" };

/** 결제창에 보일 주문명 — 「첫 상품 외 N건」, 최대 100자 */
export function orderName(names: string[]): string {
  if (!names.length) return "주문 상품";
  const first = names[0].trim() || "주문 상품";
  const name = names.length > 1 ? `${first} 외 ${names.length - 1}건` : first;
  return name.length > 100 ? `${name.slice(0, 97)}...` : name;
}

/** 결제창에서 돌아온 값 검사 — 주문 번호가 같고 금액이 숫자일 때만 승인 요청 */
export function parseSuccessParams(orderId: string, q: { paymentKey?: string; orderId?: string; amount?: string }):
  | { ok: true; paymentKey: string; amount: number }
  | { ok: false; error: string } {
  if (!q.paymentKey || !/^[A-Za-z0-9_-]{10,200}$/.test(q.paymentKey)) return { ok: false, error: "결제 정보가 올바르지 않습니다." };
  if (q.orderId !== orderId) return { ok: false, error: "주문 번호가 맞지 않습니다." };
  const amount = Number(q.amount);
  if (!Number.isSafeInteger(amount) || amount <= 0) return { ok: false, error: "결제 금액이 올바르지 않습니다." };
  return { ok: true, paymentKey: q.paymentKey, amount };
}

export const CARD_STATUS_LABEL: Record<string, string> = {
  requested: "승인 확인 중",
  done: "결제 완료",
  failed: "결제 실패",
  unknown: "확인 필요",
  partial_canceled: "일부 환불",
  canceled: "전액 환불",
};
