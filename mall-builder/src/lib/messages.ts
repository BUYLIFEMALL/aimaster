// M2-12a(2026-11-16) 운영사 메시지 — 화면·서버 동작·시험이 함께 쓰는 순수 계산(DB 0101과 같은 기준)
// 플랜: docs/PLAN_20261116_M2_12_MESSAGING_EXCHANGE.md. 발송은 DB 함수 mall_builder_message_send가 막기 규칙(권한·연결·광고·상한)을 모두 검사한다.
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문
import { cleanDate, kstDayStart, kstNextDayStart } from "./order-list.ts";

export const MESSAGE_LIMIT = { sms: 1000, email: 2000 } as const;
export const SUBJECT_MAX = 100;
export const OPTOUT_MAX = 60;
export const BULK_ONCE_MAX = 1000;
export const BULK_DAY_MAX = 3000;

/** 자동 알림 종류 — 문구를 몰마다 고칠 수 있는 것(DB mall_builder_notify_templates.kind) */
export const TEMPLATE_KINDS = [
  { key: "staff_new_order", label: "새 주문 → 운영사" },
  { key: "customer_received", label: "주문 접수 → 유저" },
  { key: "customer_paid", label: "입금 확인 → 유저" },
  { key: "customer_shipped", label: "발송 → 유저" },
  { key: "customer_expired", label: "자동 취소 → 유저" },
  { key: "customer_cancelled", label: "주문 취소 → 유저" },
  { key: "customer_returned", label: "반품 승인 → 유저" },
  { key: "customer_refunded", label: "환불 완료 → 유저" },
] as const;
export type TemplateKind = (typeof TEMPLATE_KINDS)[number]["key"];

/** 0101에서 새로 켤 수 있는 알림(설정 extra_kinds) */
export const EXTRA_KINDS = ["customer_cancelled", "customer_returned", "customer_refunded"] as const;
export type ExtraKind = (typeof EXTRA_KINDS)[number];

/** 치환 문자 — DB mall_builder_private.fill_order_text와 같은 목록 */
export const PLACEHOLDERS = ["{몰이름}", "{주문번호}", "{금액}", "{받는분}", "{택배사}", "{송장번호}", "{입금계좌}", "{입금기한}", "{환불금액}"] as const;

export const SAMPLE_VALUES: Record<(typeof PLACEHOLDERS)[number], string> = {
  "{몰이름}": "샘플몰",
  "{주문번호}": "B2B-0001",
  "{금액}": "33,000원",
  "{받는분}": "홍길동",
  "{택배사}": "CJ대한통운",
  "{송장번호}": "123456789012",
  "{입금계좌}": "국민 123-45-6789 (샘플몰)",
  "{입금기한}": "11/18 23:59",
  "{환불금액}": "30,000원",
};

/** 미리보기용 치환(DB와 같은 단순 바꾸기) */
export function fillPlaceholders(text: string, values: Partial<Record<string, string>> = SAMPLE_VALUES): string {
  let out = text;
  for (const p of PLACEHOLDERS) out = out.split(p).join(values[p] ?? "");
  return out;
}

/** 모르는 {…}가 있는지 — 오타를 저장 전에 알린다 */
export function unknownPlaceholders(text: string): string[] {
  const found = text.match(/\{[^{}\s]{1,10}\}/g) ?? [];
  return [...new Set(found.filter((f) => !(PLACEHOLDERS as readonly string[]).includes(f)))];
}

/** 문자 길이(바이트) — 한글 등 2바이트, 영문·숫자 1바이트(솔라피 EUC-KR 기준 근사) */
export function smsBytes(text: string): number {
  let n = 0;
  for (const ch of text) n += ch.charCodeAt(0) > 0x7f ? 2 : 1;
  return n;
}

/** 단문(90바이트 이하) / 장문 — 발송 요금이 달라 미리 보여 준다 */
export function smsType(text: string): "SMS" | "LMS" {
  return smsBytes(text) <= 90 ? "SMS" : "LMS";
}

/** DB가 붙이는 앞뒤 글(몰 이름·광고 표시·수신 거부 안내)까지 합친 실제 문자 — 화면 미리보기용 */
export function composeSms(storeName: string, body: string, isAd: boolean, optout: string): string {
  return `${isAd ? "(광고)" : ""}[${storeName}] ${body.trim()}${isAd ? `\n${optout}` : ""}`;
}

export type MessageInput = { channel: "sms" | "email"; isAd: boolean; subject: string; body: string };

/** 입력 검사(서버 동작 앞단 — DB가 다시 검사한다) */
export function validateMessage(form: { channel: unknown; is_ad?: unknown; subject?: unknown; body: unknown }): { ok: true; value: MessageInput } | { ok: false; error: string } {
  const channel = form.channel === "email" ? "email" : form.channel === "sms" ? "sms" : null;
  if (!channel) return { ok: false, error: "문자 또는 메일을 골라 주세요." };
  const body = String(form.body ?? "").trim();
  const subject = String(form.subject ?? "").trim();
  if (!body) return { ok: false, error: "보낼 내용을 적어 주세요." };
  if (body.length > MESSAGE_LIMIT[channel]) return { ok: false, error: `내용은 ${MESSAGE_LIMIT[channel].toLocaleString("ko-KR")}자까지입니다.` };
  if (channel === "email" && !subject) return { ok: false, error: "메일 제목을 적어 주세요." };
  if (subject.length > SUBJECT_MAX) return { ok: false, error: `제목은 ${SUBJECT_MAX}자까지입니다.` };
  return { ok: true, value: { channel, isAd: form.is_ad === "1" || form.is_ad === "on" || form.is_ad === true, subject, body } };
}

/** 설정 검사(상한·수신 거부 안내·새 알림) */
export function validateMessageSettings(form: { bulk_once: unknown; bulk_day: unknown; optout?: unknown; kinds?: unknown[]; email_kinds?: unknown[] }):
  { ok: true; value: { bulkOnce: number; bulkDay: number; optout: string; kinds: ExtraKind[]; emailKinds: ExtraKind[] } } | { ok: false; error: string } {
  const once = Number(form.bulk_once);
  const day = Number(form.bulk_day);
  if (!Number.isInteger(once) || once < 1 || once > BULK_ONCE_MAX) return { ok: false, error: `한 번에 보낼 인원은 1~${BULK_ONCE_MAX.toLocaleString("ko-KR")}명입니다.` };
  if (!Number.isInteger(day) || day < 1 || day > BULK_DAY_MAX) return { ok: false, error: `하루에 보낼 인원은 1~${BULK_DAY_MAX.toLocaleString("ko-KR")}명입니다.` };
  const optout = String(form.optout ?? "").trim();
  if (optout.length > OPTOUT_MAX) return { ok: false, error: `수신 거부 안내는 ${OPTOUT_MAX}자까지입니다.` };
  const pickKinds = (v: unknown[] | undefined) => [...new Set((v ?? []).map(String).filter((k): k is ExtraKind => (EXTRA_KINDS as readonly string[]).includes(k)))];
  return { ok: true, value: { bulkOnce: once, bulkDay: day, optout, kinds: pickKinds(form.kinds), emailKinds: pickKinds(form.email_kinds) } };
}

// ── 발송 내역(a5) 조건 ──
export const LOG_PAGE_SIZE = 50;
export const LOG_STATUSES = ["queued", "sent", "failed", "unknown", "expired"] as const;
export type MessageLogQuery = {
  channel?: "sms" | "email";
  status?: (typeof LOG_STATUSES)[number];
  source?: "auto" | "manual"; // 자동 알림 / 직접 보낸 메시지
  from?: string;
  to?: string;
  page: number;
};
type Raw = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseMessageLogQuery(raw: Raw): MessageLogQuery {
  const channel = one(raw.channel);
  const status = one(raw.status);
  const source = one(raw.source);
  let from = cleanDate(one(raw.from));
  let to = cleanDate(one(raw.to));
  if (from && to && from > to) [from, to] = [to, from];
  return {
    channel: channel === "sms" || channel === "email" ? channel : undefined,
    status: (LOG_STATUSES as readonly string[]).includes(status) ? (status as MessageLogQuery["status"]) : undefined,
    source: source === "auto" || source === "manual" ? source : undefined,
    from,
    to,
    page: Math.min(Math.max(Number.parseInt(one(raw.page), 10) || 1, 1), 1000),
  };
}

export function messageLogHref(base: string, cur: MessageLogQuery, patch: Partial<MessageLogQuery>): string {
  const n = { ...cur, ...patch };
  const sp = new URLSearchParams();
  if (n.channel) sp.set("channel", n.channel);
  if (n.status) sp.set("status", n.status);
  if (n.source) sp.set("source", n.source);
  if (n.from) sp.set("from", n.from);
  if (n.to) sp.set("to", n.to);
  if (n.page > 1) sp.set("page", String(n.page));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

type LogFilterable<Q> = {
  eq(col: string, v: string): Q;
  is(col: string, v: null): Q;
  not(col: string, op: string, v: null): Q;
  gte(col: string, v: string): Q;
  lt(col: string, v: string): Q;
};
export function applyMessageLogFilters<Q extends LogFilterable<Q>>(query: Q, f: MessageLogQuery): Q {
  let q = query;
  if (f.channel) q = q.eq("channel", f.channel);
  if (f.status) q = q.eq("status", f.status);
  if (f.source === "manual") q = q.not("campaign_id", "is", null);
  if (f.source === "auto") q = q.is("campaign_id", null);
  if (f.from) q = q.gte("created_at", kstDayStart(f.from));
  if (f.to) q = q.lt("created_at", kstNextDayStart(f.to));
  return q;
}
