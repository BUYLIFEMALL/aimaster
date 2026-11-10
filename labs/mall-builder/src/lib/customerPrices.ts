// D24 거래처 특가 — 입력값 검사(운영자 손님 상세 화면). DB: mall_builder_customer_prices
// 상품별 특가 = 금액("23000") 또는 할인율("5%"), 기본 할인율 = 할인율만. 검사는 등급가와 같은 함수(parseGradePrice).

import { parseGradePrice } from "./products.ts";

export type SpecialValue = { price: number | null; discount_rate: number | null };

/** 끝나는 날: 비우면 null(계속), 형식은 YYYY-MM-DD, 오늘(한국 날짜)보다 앞이면 오류 */
export function parseEndsOn(input: unknown, today: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const s = String(input ?? "").trim();
  if (!s) return { ok: true, value: null };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return { ok: false, error: "끝나는 날을 2026-12-31처럼 입력해 주세요." };
  if (s < today) return { ok: false, error: "끝나는 날이 이미 지났습니다." };
  return { ok: true, value: s };
}

/** 상품별 특가 값 — 금액 또는 할인율, 비우면 오류 */
export function parseSpecialPrice(input: unknown): { ok: true; value: SpecialValue } | { ok: false; error: string } {
  const r = parseGradePrice(input);
  if (!r.ok) return { ok: false, error: r.error.replace("등급가", "특가") };
  if (!r.value) return { ok: false, error: "특가를 금액(예: 23000) 또는 할인율(예: 5%)로 입력해 주세요." };
  return { ok: true, value: r.value };
}

/** 거래처 기본 할인율 — 할인율만(1~99%), 비우면 null(지움) */
export function parseBaseRate(input: unknown): { ok: true; value: number | null } | { ok: false; error: string } {
  const s = String(input ?? "").replace(/[\s%]/g, "");
  if (!s) return { ok: true, value: null };
  if (!/^\d{1,2}$/.test(s) || Number(s) < 1) return { ok: false, error: "기본 할인율은 1~99%로 입력해 주세요." };
  return { ok: true, value: Number(s) };
}

export function specialText(v: SpecialValue): string {
  return v.discount_rate != null ? `${v.discount_rate}% 할인` : `${(v.price ?? 0).toLocaleString("ko-KR")}원`;
}

/** 오늘 한국 날짜(YYYY-MM-DD) */
export const todayKst = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
