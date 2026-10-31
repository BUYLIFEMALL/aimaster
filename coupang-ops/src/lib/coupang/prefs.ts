import { AI_MODEL_OPTIONS, type AIModelProvider } from "../ai/models.ts";

// 회원 설정 정리(R3·R5·R7). 외부 호출 없음(tests/prefs.test.mjs). 저장 전에 크기를 제한한다.
export type ReplyTemplate = { title: string; text: string };
export type ListingTemplate = { name: string; brand: string; manufacturer: string; code: string; tags: string; searchVals: Record<string, string>; axisText: Record<string, string> };
export type Prefs = { replyTemplates: ReplyTemplate[]; listingTemplates: ListingTemplate[]; unitCosts: Record<string, string>; targetMargin: string; wingKeyExpiry: string; aiModels: Partial<Record<AIModelProvider, string>>; feeRate: string; alertEmailTo: string };

const MAX_REPLY = 30;
const MAX_LISTING = 20;
const MAX_COSTS = 3000;
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const strMap = (v: unknown, maxKeys: number, maxLen: number) =>
  Object.fromEntries(Object.entries(v && typeof v === "object" ? (v as Record<string, unknown>) : {}).slice(0, maxKeys).map(([k, x]) => [k.slice(0, 100), text(x, maxLen)]));

const KST_MS = 9 * 3_600_000;
const DAY_MS = 86_400_000;
const isDate = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
export const isExpiryDate = isDate;

/** S1 키 저장일(한국 날짜)에서 6개월 뒤. 말일을 넘기면 그 달 마지막 날로 맞춘다 */
export function defaultKeyExpiry(nowMs: number): string {
  const d = new Date(nowMs + KST_MS);
  const day = d.getUTCDate();
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 7, 0));
  end.setUTCDate(Math.min(day, end.getUTCDate()));
  return end.toISOString().slice(0, 10);
}

export const KEY_WARN_DAYS = 30;
export type KeyNotice = { level: "soon" | "urgent" | "expired"; days: number; text: string };

/** S1 만료 안내. 30일 넘게 남았거나 날짜가 없으면 null. 7일 이내는 긴급 */
export function keyExpiryNotice(expiry: string, nowMs: number): KeyNotice | null {
  if (!isDate(expiry)) return null;
  const today = Date.parse(`${new Date(nowMs + KST_MS).toISOString().slice(0, 10)}T00:00:00Z`);
  const days = Math.round((Date.parse(`${expiry}T00:00:00Z`) - today) / DAY_MS);
  if (days > KEY_WARN_DAYS) return null;
  if (days < 0) return { level: "expired", days, text: `쿠팡 WING 키 만료일(${expiry})이 지났습니다. WING에서 재발급해 새 키를 등록해 주세요.` };
  return { level: days <= 7 ? "urgent" : "soon", days, text: `쿠팡 WING 키가 ${days === 0 ? "오늘" : `${days}일 뒤`}(${expiry}) 만료될 예정입니다. 만료되면 모든 쿠팡 기능과 아침 요약이 멈추니 WING에서 재발급해 새 키를 등록해 주세요.` };
}

/** 플랫폼별로 고른 모델. 목록에 있고 그 플랫폼의 모델인 값만 남긴다 */
export function cleanAiModels(raw: unknown): Partial<Record<AIModelProvider, string>> {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Partial<Record<AIModelProvider, string>> = {};
  for (const o of AI_MODEL_OPTIONS) if (r[o.provider] === o.value) out[o.provider] = o.value;
  return out;
}

export function normalizePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    replyTemplates: (Array.isArray(r.replyTemplates) ? r.replyTemplates : []).map((t: Record<string, unknown>) => ({ title: text(t?.title, 40), text: text(t?.text, 2000) })).filter((t) => t.title && t.text).slice(0, MAX_REPLY),
    listingTemplates: (Array.isArray(r.listingTemplates) ? r.listingTemplates : [])
      .map((t: Record<string, unknown>) => ({ name: text(t?.name, 40), brand: text(t?.brand, 60), manufacturer: text(t?.manufacturer, 60), code: text(t?.code, 12).replace(/\D/g, ""), tags: text(t?.tags, 500), searchVals: strMap(t?.searchVals, 40, 100), axisText: strMap(t?.axisText, 10, 300) }))
      .filter((t) => t.name)
      .slice(0, MAX_LISTING),
    unitCosts: strMap(r.unitCosts, MAX_COSTS, 12),
    targetMargin: text(r.targetMargin, 6),
    feeRate: text(r.feeRate, 6),
    alertEmailTo: text(r.alertEmailTo, 254),
    wingKeyExpiry: isDate(r.wingKeyExpiry) ? String(r.wingKeyExpiry) : "",
    aiModels: cleanAiModels(r.aiModels),
  };
}

/** 같은 이름이 있으면 바꾸고, 없으면 맨 앞에 넣는다 */
export const upsertNamed = <T,>(list: T[], item: T, nameOf: (x: T) => string): T[] => [item, ...list.filter((x) => nameOf(x) !== nameOf(item))];
