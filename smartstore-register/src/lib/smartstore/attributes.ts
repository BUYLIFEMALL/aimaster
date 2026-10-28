// 상품속성 불러오기 — 회원 확장이 판매자센터에서 「읽기만」 한 카테고리 속성 목록을 정리하고, 고른 값을 「이름: 값」 글로 바꾼다.
// 판매자센터 데이터 모양(2026-10-28 ego 실측): attribute-group → attributeName·attributeClassificationType·attributeValueMaxMatchingCount·attributeValues[].attributeValueText, attributeRequired

export type AttrType = "SINGLE_SELECT" | "MULTI_SELECT" | "TEXT";
export interface AttrDef { name: string; type: AttrType; max: number; required: boolean; values: string[] }
export interface AttrCategory { id: string; path: string }
export interface AttrLookupResult { category: AttrCategory; candidates: AttrCategory[]; attributes: AttrDef[] }

/** 속성 읽기를 하는 확장 최소 버전 */
export const ATTR_EXT_MIN = "v1.21";
/** 같은 카테고리 결과를 다시 쓰는 기간 */
export const ATTR_REUSE_DAYS = 7;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const cat = (v: unknown): AttrCategory | null => {
  const o = v as { id?: unknown; path?: unknown } | null;
  const id = String(o?.id ?? "").trim();
  return /^\d{1,12}$/.test(id) ? { id, path: str(o?.path, 200) } : null;
};

/** 확장이 보낸 결과를 믿지 않고 모양·크기를 정리한다(너무 크거나 이상하면 null) */
export function normalizeLookupResult(raw: unknown): AttrLookupResult | null {
  const r = raw as { category?: unknown; candidates?: unknown; attributes?: unknown } | null;
  const category = cat(r?.category);
  if (!category) return null;
  const candidates = (Array.isArray(r?.candidates) ? r!.candidates : []).map(cat).filter((c): c is AttrCategory => Boolean(c)).slice(0, 20);
  const attributes: AttrDef[] = [];
  for (const a of Array.isArray(r?.attributes) ? (r!.attributes as unknown[]).slice(0, 60) : []) {
    const o = a as { name?: unknown; type?: unknown; max?: unknown; required?: unknown; values?: unknown };
    const name = str(o.name, 40);
    if (!name || attributes.some((x) => x.name === name)) continue;
    const type: AttrType = o.type === "SINGLE_SELECT" || o.type === "MULTI_SELECT" ? o.type : "TEXT";
    const values = [...new Set((Array.isArray(o.values) ? o.values : []).map((v) => str(v, 60)).filter(Boolean))].slice(0, 300);
    const max = Number.isInteger(o.max) && (o.max as number) > 0 ? Math.min(o.max as number, 50) : 0;
    attributes.push({ name, type: values.length ? type : "TEXT", max, required: o.required === true, values });
  }
  return { category, candidates: candidates.some((c) => c.id === category.id) ? candidates : [category, ...candidates].slice(0, 20), attributes };
}

/** 「이름: 값1, 값2」 글 → { 이름: [값…] } (확장 입력 형식과 같음) */
export function parseAttrText(text: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const line of String(text ?? "").split("\n")) {
    const i = line.search(/[:：]/);
    if (i <= 0) continue;
    const name = line.slice(0, i).trim();
    const vals = line.slice(i + 1).split(",").map((v) => v.trim()).filter(Boolean);
    if (name && vals.length && !out[name]) out[name] = vals;
  }
  return out;
}

/** { 이름: [값…] } → 「이름: 값1, 값2」 줄(빈 속성은 뺌, 순서는 속성 목록 순서 → 나머지) */
export function attrsToText(picked: Record<string, string[]>, order: string[] = []): string {
  const names = [...order.filter((n) => picked[n]?.length), ...Object.keys(picked).filter((n) => !order.includes(n) && picked[n]?.length)];
  return names.map((n) => `${n}: ${picked[n].join(", ")}`).join("\n");
}
