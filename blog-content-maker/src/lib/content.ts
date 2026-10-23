import type { Asset, Audit, Brief, Draft, MediaPlan } from "./types";
import { DEFAULT_BRIEF, MODES } from "./types";

export function cleanText(value: unknown, max = 60000): string { return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, max).trim() : ""; }
export function safeUrl(value: unknown): string { try { const u = new URL(String(value)); return u.protocol === "https:" && !u.username && !u.password ? u.href : ""; } catch { return ""; } }
export function normalizeBrief(value: unknown): Brief {
  const v = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const integer = (k: string, fallback: number, min: number, max: number) => Number.isFinite(Number(v[k])) ? Math.max(min, Math.min(max, Math.round(Number(v[k])))) : fallback;
  return { ...DEFAULT_BRIEF, inputType: v.inputType === "rewrite" ? "rewrite" : "topic", topic: cleanText(v.topic, 300), original: cleanText(v.original), keyword: cleanText(v.keyword, 100), subkeywords: cleanText(v.subkeywords, 500), audience: cleanText(v.audience, 300) || DEFAULT_BRIEF.audience, tone: cleanText(v.tone, 300) || DEFAULT_BRIEF.tone, experience: cleanText(v.experience, 4000), mode: typeof v.mode === "string" && v.mode in MODES ? v.mode as Brief["mode"] : "information", includeFaq: v.includeFaq !== false, imageCount: integer("imageCount", 3, 0, 10), sceneCount: integer("sceneCount", 0, 0, 3), targetLength: integer("targetLength", 2200, 800, 6000) };
}
export function normalizeDraft(value: unknown): Draft {
  if (!value || typeof value !== "object") throw new Error("원고 응답을 확인할 수 없습니다.");
  const v = value as Record<string, unknown>;
  const title = cleanText(v.title, 200), body = cleanText(v.body);
  if (!title || body.length < 50) throw new Error("AI가 충분한 원고를 반환하지 않았습니다. 저장된 원문은 보존됩니다.");
  const media: MediaPlan[] = Array.isArray(v.media) ? v.media.slice(0, 16).map((m, i) => ({ id: `media-${i + 1}`, kind: ["scene-start", "scene-end"].includes(m.kind) ? m.kind : "image", alt: cleanText(m.alt, 200), prompt: cleanText(m.prompt, 3000), placement: Math.max(0, Math.min(200, Number(m.placement) || 0)) })) : [];
  return { title, body, tags: Array.isArray(v.tags) ? [...new Set(v.tags.map(t => cleanText(t, 50).replace(/^#+/, "")).filter(Boolean))].slice(0, 10) : [], summary: cleanText(v.summary, 1000), changeSummary: cleanText(v.changeSummary, 2000), media, sources: [], social: Array.isArray(v.social) ? v.social.filter(s => ["Threads", "X", "Facebook"].includes(s.platform)).map(s => ({ platform: s.platform, content: cleanText(s.content, 3000) })).slice(0, 3) : [] };
}
// Stable, browser/server-identical content signature. Not a security hash.
export function fingerprint(draft: Draft, assets: Asset[]): string {
  const raw = JSON.stringify([draft.title, draft.body, draft.tags, draft.media, draft.sources, assets.map(a => [a.id, a.alt, a.placement, a.plan_id]).sort((a, b) => String(a[0]).localeCompare(String(b[0])))]);
  let h = 2166136261; for (let i = 0; i < raw.length; i++) h = Math.imul(h ^ raw.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
export function auditDraft(d: Draft, b: Brief, assets: Asset[], confirmations: { facts?: boolean; experience?: boolean } = {}): Audit {
  const body = d.body, plain = body.replace(/[#*_>|`]/g, ""), chars = [...plain.replace(/\s/g, "")].length;
  const expected = d.media.filter(m => m.kind === "image");
  const hasFaq = /(?:FAQ|자주\s*묻는|질문과\s*답변)/i.test(body);
  const items: Audit["items"] = [];
  function rule(id: string, label: string, pass: boolean, detail: string) { items.push({ id, label, status: pass ? "pass" : "warn", detail, source: "rule" }); }
  rule("title", "제목과 핵심 키워드", !!d.title && (!b.keyword || d.title.includes(b.keyword)), `${[...d.title].length}자 · 핵심 키워드 ${b.keyword || "미지정"}`);
  rule("length", "본문 분량", chars >= Math.round(b.targetLength * .8), `공백 제외 ${chars}자 / 작성 목표 ${b.targetLength}자의 80% 이상 권장 (내부 기준)`);
  rule("headings", "읽기 쉬운 문단 구조", (body.match(/^#{2,3}\s/gm) || []).length >= 2, `소제목 ${(body.match(/^#{2,3}\s/gm) || []).length}개`);
  rule("faq", "FAQ 선택 반영", b.includeFaq ? hasFaq : !hasFaq, b.includeFaq ? "질문·답변 구간이 필요합니다." : "FAQ 제외를 선택했습니다.");
  rule("tags", "관련 태그", d.tags.length >= 1 && d.tags.length <= 10, `${d.tags.length}개 · 관련성은 직접 확인해 주세요.`);
  const ready = expected.filter(m => assets.some(a => a.plan_id === m.id && a.alt.trim()));
  rule("images", "실제 본문 이미지", b.imageCount === 0 || ready.length >= b.imageCount, b.imageCount === 0 ? "이미지 제외 선택" : `실제 자산·ALT 연결 ${ready.length}개 / 요청 ${b.imageCount}개 · 자리표시자는 세지 않습니다.`);
  const years = [...body.matchAll(/\b(20\d{2})년?/g)].map(m => Number(m[1]));
  const old = years.filter(y => y < new Date().getFullYear());
  rule("year", "현재 연도·과거 수치 확인", old.length === 0, old.length ? `과거 연도 ${[...new Set(old)].join(", ")} 발견 · 역사 설명인지 지난 정보인지 확인해 주세요.` : `현재 ${new Date().getFullYear()}년 기준`);
  const longParas = body.split(/\n\s*\n/).filter(p => p.length > 600).length;
  rule("paragraphs", "긴 문단", longParas === 0, `600자 초과 문단 ${longParas}개 (내부 가독성 기준)`);
  items.push({ id: "facts", label: "수치·가격·정책·출처 직접 확인", status: confirmations.facts ? "pass" : "review", source: "member", detail: confirmations.facts ? "회원이 근거를 확인했습니다. 사실성을 자동 보증하지 않습니다." : `확인된 검색 출처 ${d.sources.length}개 · 확인되지 않은 내용은 발행 전에 검토해 주세요.` });
  items.push({ id: "experience", label: "실제 경험·후기 확인", status: confirmations.experience ? "pass" : "review", source: "member", detail: "직접 경험하지 않은 내용을 본인 후기처럼 쓰지 않았는지 확인합니다." });
  const counts = new Map<string, number>(), stop = new Set(["그리고", "하지만", "있는", "있습니다", "합니다", "것입니다", "때문에", "이미지", "본문", "이러한"]);
  for (const word of plain.replace(/[^가-힣a-zA-Z0-9\s]/g, " ").split(/\s+/)) if (word.length >= 2 && !stop.has(word) && !/^\d+$/.test(word)) counts.set(word, (counts.get(word) || 0) + 1);
  return { fingerprint: fingerprint(d, assets), items, score: Math.round(items.filter(i => i.status === "pass").length / items.length * 100), checkedAt: new Date().toISOString(), words: [...counts].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([word, count]) => ({ word, count })) };
}
export function escapeHtml(v: string) { return v.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!)); }
export function activeAssets(assets: Asset[], media?: MediaPlan[]): Asset[] { const allowed = media ? new Set(media.map(m => m.id)) : null; const latest = new Map<string, Asset>(); for (const a of assets) if (a.kind !== "reference" && (!allowed || allowed.has(a.plan_id))) latest.set(a.plan_id || a.id, a); return [...latest.values()]; }
export function markdownHtml(text: string): string {
  const lines = text.split(/\r?\n/), out: string[] = []; let table = false;
  const inline = (s: string) => escapeHtml(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  for (const line of lines) {
    if (/^\s*\|.*\|\s*$/.test(line)) { if (/^\s*\|[\s:|\-]+\|\s*$/.test(line)) continue; if (!table) { out.push("<table><tbody>"); table = true; } out.push("<tr>" + line.trim().slice(1, -1).split("|").map(c => `<td>${inline(c.trim())}</td>`).join("") + "</tr>"); continue; }
    if (table) { out.push("</tbody></table>"); table = false; }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) out.push(`<h${Math.max(2, heading[1].length)}>${inline(heading[2])}</h${Math.max(2, heading[1].length)}>`);
    else if (line.startsWith("> ")) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else if (line.trim()) out.push(`<p>${inline(line.replace(/^[-*]\s+/, "• "))}</p>`);
  }
  if (table) out.push("</tbody></table>"); return out.join("\n");
}
export function articleHtml(d: Draft, assets: Asset[]): string {
  assets = activeAssets(assets, d.media);
  const paragraphs = d.body.split(/\n\s*\n/), used = new Set<string>();
  const body = paragraphs.map((p, i) => { const images = assets.filter(a => a.kind !== "reference" && a.placement === i && safeUrl(a.url) && !used.has(a.id)).map(a => { used.add(a.id); return `<figure><img src="${escapeHtml(a.url!)}" alt="${escapeHtml(a.alt)}"><figcaption>${escapeHtml(a.alt)}</figcaption></figure>`; }).join(""); return images + markdownHtml(p); }).join("\n");
  const rest = assets.filter(a => a.kind !== "reference" && !used.has(a.id) && safeUrl(a.url)).map(a => `<figure><img src="${escapeHtml(a.url!)}" alt="${escapeHtml(a.alt)}"></figure>`).join("");
  return `<article><h1>${escapeHtml(d.title)}</h1>${body}${rest}<p>${d.tags.map(t => escapeHtml("#" + t)).join(" ")}</p></article>`;
}
