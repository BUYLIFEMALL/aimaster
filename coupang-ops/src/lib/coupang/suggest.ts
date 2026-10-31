// C2-7 AI 추천 결과 정리. AI가 쿠팡 목록에 없는 값이나 없는 칸을 돌려줘도 화면에 넣지 않는다(tests/summary.test.mjs).
export type SuggestAttr = { name: string; values: string[] };
export type Suggestion = { tags: string[]; attributes: Record<string, string> };

const MAX_TAGS = 20;
const MAX_TAG_LENGTH = 20;

export function cleanSuggestion(raw: unknown, attrs: SuggestAttr[]): Suggestion {
  const r = (raw ?? {}) as { tags?: unknown; attributes?: unknown };
  const tags = [...new Set((Array.isArray(r.tags) ? r.tags : []).map((t) => String(t).trim()).filter((t) => t && t.length <= MAX_TAG_LENGTH))].slice(0, MAX_TAGS);
  const attributes: Record<string, string> = {};
  for (const a of Array.isArray(r.attributes) ? (r.attributes as { name?: unknown; value?: unknown }[]) : []) {
    const name = String(a?.name ?? "").trim();
    const value = String(a?.value ?? "").trim();
    const def = attrs.find((x) => x.name === name);
    if (!def || !value || attributes[name]) continue;
    if (def.values.length && !def.values.includes(value)) continue;
    attributes[name] = value.slice(0, 100);
  }
  return { tags, attributes };
}
