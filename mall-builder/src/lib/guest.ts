// 비회원 주문(D15) — 쿠키 장바구니·비회원 입력 검사·조회 토큰 쿠키 이름. DB 함수가 가격·재고·권한을 다시 검사한다
import { normalizeMobile } from "./customers.ts";

export const MAX_GUEST_LINES = 20;
export const GUEST_TOKEN_DAYS = 7;

export type GuestCartLine = { p: string; v: string | null; q: number };

export function cartCookieName(slug: string): string { return `mb_cart_${slug}`; }
export function guestCookieName(slug: string): string { return `mb_guest_${slug}`; }

/** 몰 설정에서 비회원 주문 허용 여부 */
export function guestOrderEnabled(settings: unknown): boolean {
  return !!settings && typeof settings === "object" && (settings as { guest_order?: unknown }).guest_order === true;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** 쿠키 글자 → 장바구니 줄(모양이 틀린 줄은 버린다) */
export function parseCart(raw: string | undefined | null): GuestCartLine[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const out: GuestCartLine[] = [];
    for (const x of arr) {
      if (!x || typeof x !== "object") continue;
      const p = String((x as { p?: unknown }).p ?? "");
      const v = (x as { v?: unknown }).v;
      const q = Number((x as { q?: unknown }).q);
      if (!UUID.test(p)) continue;
      if (v != null && !UUID.test(String(v))) continue;
      if (!Number.isInteger(q) || q < 1 || q > 999) continue;
      out.push({ p, v: v == null ? null : String(v), q });
      if (out.length >= MAX_GUEST_LINES) break;
    }
    return out;
  } catch {
    return [];
  }
}

export function serializeCart(lines: GuestCartLine[]): string {
  return JSON.stringify(lines.slice(0, MAX_GUEST_LINES));
}

/** 같은 상품·옵션이 있으면 수량을 더한다. 줄이 가득 차면 실패 */
export function addLine(lines: GuestCartLine[], p: string, v: string | null, q: number): { ok: true; lines: GuestCartLine[]; qty: number } | { ok: false; error: string } {
  const idx = lines.findIndex((l) => l.p === p && (l.v ?? null) === (v ?? null));
  if (idx >= 0) {
    const qty = lines[idx].q + q;
    if (qty > 999) return { ok: false, error: "수량은 999개까지입니다." };
    const next = lines.map((l, i) => (i === idx ? { ...l, q: qty } : l));
    return { ok: true, lines: next, qty };
  }
  if (lines.length >= MAX_GUEST_LINES) return { ok: false, error: `비회원 장바구니는 ${MAX_GUEST_LINES}줄까지 담을 수 있습니다.` };
  return { ok: true, lines: [...lines, { p, v: v ?? null, q }], qty: q };
}

export function setLineQty(lines: GuestCartLine[], index: number, q: number): GuestCartLine[] {
  return lines.map((l, i) => (i === index ? { ...l, q } : l));
}

export function removeLine(lines: GuestCartLine[], index: number): GuestCartLine[] {
  return lines.filter((_, i) => i !== index);
}

export type GuestOrderInput = {
  guest: { name: string; phone: string; email: string };
  receiver: { receiver: string; phone: string; zip: string; addr1: string; addr2: string };
  depositor: string;
  memo: string;
};

/** 비회원 주문서 입력 검사 — DB 함수와 같은 기준(이름 1~30, 휴대폰, 이메일 선택, 우편번호 5자리, 주소 2~120) */
export function validateGuestOrder(input: Record<string, unknown>): { ok: true; value: GuestOrderInput } | { ok: false; error: string } {
  const s = (k: string) => String(input[k] ?? "").trim();
  const name = s("guest_name");
  if (name.length < 1 || name.length > 30) return { ok: false, error: "주문하는 분 이름을 1~30자로 입력해 주세요." };
  const phone = normalizeMobile(s("guest_phone"));
  if (!phone) return { ok: false, error: "휴대폰 번호를 확인해 주세요(예: 010-1234-5678)." };
  const email = s("guest_email").toLowerCase();
  if (email && (email.length > 100 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return { ok: false, error: "이메일 주소를 확인해 주세요." };
  const receiver = s("receiver");
  if (receiver.length < 1 || receiver.length > 30) return { ok: false, error: "받는 분 이름을 입력해 주세요." };
  const rphone = normalizeMobile(s("phone"));
  if (!rphone) return { ok: false, error: "받는 분 휴대폰 번호를 확인해 주세요." };
  const zip = s("zip").replace(/\D/g, "");
  if (!/^\d{5}$/.test(zip)) return { ok: false, error: "우편번호 5자리를 입력해 주세요." };
  const addr1 = s("addr1");
  if (addr1.length < 2 || addr1.length > 120) return { ok: false, error: "주소를 입력해 주세요." };
  const addr2 = s("addr2");
  if (addr2.length > 120) return { ok: false, error: "상세 주소는 120자 이내로 입력해 주세요." };
  const depositor = s("depositor") || name;
  if (depositor.length > 20) return { ok: false, error: "입금자명은 20자 이내로 입력해 주세요." };
  const memo = s("memo");
  if (memo.length > 200) return { ok: false, error: "배송 메모는 200자 이내로 입력해 주세요." };
  return { ok: true, value: { guest: { name, phone, email }, receiver: { receiver, phone: rphone, zip, addr1, addr2 }, depositor, memo } };
}

/** 주문 조회 입력(주문번호 YYYYMMDD-0000 + 휴대폰) */
export function validateLookup(input: Record<string, unknown>): { ok: true; value: { orderNo: string; phone: string } } | { ok: false; error: string } {
  const orderNo = String(input.order_no ?? "").trim();
  if (!/^\d{8}-\d{4}$/.test(orderNo)) return { ok: false, error: "주문번호를 20261106-0001 모양으로 입력해 주세요." };
  const phone = normalizeMobile(String(input.phone ?? ""));
  if (!phone) return { ok: false, error: "주문할 때 적은 휴대폰 번호를 입력해 주세요." };
  return { ok: true, value: { orderNo, phone } };
}
