// 회원 설정 정리(R3·R5·R7). 외부 호출 없음(tests/prefs.test.mjs). 저장 전에 크기를 제한한다.
export type ReplyTemplate = { title: string; text: string };
export type ListingTemplate = { name: string; brand: string; manufacturer: string; code: string; tags: string; searchVals: Record<string, string>; axisText: Record<string, string> };
export type Prefs = { replyTemplates: ReplyTemplate[]; listingTemplates: ListingTemplate[]; unitCosts: Record<string, string>; targetMargin: string };

const MAX_REPLY = 30;
const MAX_LISTING = 20;
const MAX_COSTS = 3000;
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const strMap = (v: unknown, maxKeys: number, maxLen: number) =>
  Object.fromEntries(Object.entries(v && typeof v === "object" ? (v as Record<string, unknown>) : {}).slice(0, maxKeys).map(([k, x]) => [k.slice(0, 100), text(x, maxLen)]));

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
  };
}

/** 같은 이름이 있으면 바꾸고, 없으면 맨 앞에 넣는다 */
export const upsertNamed = <T,>(list: T[], item: T, nameOf: (x: T) => string): T[] => [item, ...list.filter((x) => nameOf(x) !== nameOf(item))];
