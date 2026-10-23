import { LIMITS, SUGGESTION_CATEGORIES, type Source, type Suggestion, type SuggestionCategory } from "./types";

// 순수 유틸(서버·클라이언트 공용, 외부 호출·비밀 값 없음) — 단위 테스트 대상.

/** 한국 시간 기준 오늘 날짜 정보 */
export function todayKst(now: Date = new Date()): { year: number; label: string } {
  const k = new Date(now.getTime() + 9 * 3600_000);
  return { year: k.getUTCFullYear(), label: `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일` };
}

/** 모든 AI 프롬프트 맨 앞에 붙이는 기준 연도 지침(핵심 원칙 8번) */
export function yearGuard(now: Date = new Date()): string {
  const t = todayKst(now);
  return `[기준 연도 엄수: 현재 연도는 ${t.year}년이고 오늘은 ${t.label}입니다. 날짜·연도·제도·통계를 쓸 때는 반드시 ${t.year}년(당해 연도)을 기준으로 하세요. 과거 연도(2023년, 2024년 등)를 현재처럼 쓰지 마세요.]`;
}

/** 제어문자를 지우고 줄바꿈을 정규화한 뒤 길이를 제한한다 */
export function cleanText(raw: unknown, max: number): string {
  return String(raw ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, max);
}

export function cleanLine(raw: unknown, max: number): string {
  return String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** 모델 응답에서 JSON 배열/객체를 꺼낸다(코드 펜스·설명문이 섞여도 첫 '[' 또는 '{'부터 짝이 맞는 곳까지). */
export function parseJsonLoose(text: string | null | undefined): unknown {
  if (!text) return null;
  const t = String(text).replace(/```(?:json)?/gi, "");
  const first = t.search(/[\[{]/);
  if (first < 0) return null;
  const open = t[first];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = first; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(t.slice(first, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

/**
 * 분석 제안을 정리한다: 형식 검증, 본문에 실제로 있는 원문만 남김, 중복·동일 문구 제거, 분류 보정, 개수 제한.
 * (원본 앱은 includes 필터만 있어 빈 제안·동일 제안이 그대로 남았다.)
 */
export function normalizeSuggestions(raw: unknown, content: string, max = 20): Suggestion[] {
  const list = Array.isArray(raw) ? raw : raw && typeof raw === "object" && Array.isArray((raw as { suggestions?: unknown }).suggestions) ? (raw as { suggestions: unknown[] }).suggestions : [];
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const originalText = typeof o.originalText === "string" ? o.originalText : "";
    const suggestedText = typeof o.suggestedText === "string" ? o.suggestedText : "";
    if (!originalText.trim() || !suggestedText.trim()) continue;
    if (originalText === suggestedText) continue;
    if (!content.includes(originalText)) continue;
    if (seen.has(originalText)) continue;
    seen.add(originalText);
    const cat = typeof o.category === "string" ? o.category.trim() : "";
    const category: SuggestionCategory = (SUGGESTION_CATEGORIES as readonly string[]).includes(cat) ? (cat as SuggestionCategory) : "표현";
    out.push({
      originalText: originalText.slice(0, 1000),
      suggestedText: suggestedText.slice(0, 1500),
      reason: cleanLine(o.reason, 200) || "표현을 다듬었습니다.",
      category,
    });
    if (out.length >= max) break;
  }
  return out;
}

/**
 * 본문에서 문자열 위치를 찾는다. hint(원래 위치)에서 정확히 일치하면 그 위치,
 * 아니면 hint에 가장 가까운 일치 위치, 없으면 -1.
 */
export function findRange(content: string, text: string, hint = 0): number {
  if (!text) return -1;
  if (content.startsWith(text, hint)) return hint;
  let best = -1;
  let from = 0;
  while (true) {
    const i = content.indexOf(text, from);
    if (i < 0) break;
    if (best < 0 || Math.abs(i - hint) < Math.abs(best - hint)) best = i;
    from = i + Math.max(1, text.length);
  }
  return best;
}

/** 위치를 다시 찾아 한 곳만 치환한다. 못 찾으면 null(적용 불가). */
export function replaceOnce(content: string, original: string, replacement: string, hint = 0): { content: string; index: number } | null {
  const i = findRange(content, original, hint);
  if (i < 0) return null;
  return { content: content.slice(0, i) + replacement + content.slice(i + original.length), index: i };
}

/** 제안을 위에서부터 차례로 적용한다. 적용한 개수와 적용하지 못한 제안을 돌려준다. */
export function applyAll(content: string, suggestions: Suggestion[]): { content: string; applied: Suggestion[]; skipped: Suggestion[] } {
  let cur = content;
  const applied: Suggestion[] = [];
  const skipped: Suggestion[] = [];
  for (const s of suggestions) {
    const r = replaceOnce(cur, s.originalText, s.suggestedText);
    if (r) { cur = r.content; applied.push(s); } else skipped.push(s);
  }
  return { content: cur, applied, skipped };
}

export function charCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

/** 문서 제목: 첫 비어 있지 않은 줄(마크다운 # 제거)을 80자까지 */
export function deriveTitle(content: string, fallback = "제목 없는 글"): string {
  for (const line of content.split("\n")) {
    const t = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*>\s]+/, "")
      .replace(/[*_`]+/g, "")
      .replace(/^(메타\s*)?제목\s*[:：]\s*/, "")
      .trim();
    if (t && !/^[-=_~\s]+$/.test(t)) return t.slice(0, LIMITS.title);
  }
  return fallback;
}

/** 편집 이력(되돌리기) 스택: 같은 값 연속 추가는 무시하고 최대 길이를 지킨다 */
export function pushHistory(stack: string[], value: string, max = 50): string[] {
  if (stack[stack.length - 1] === value) return stack;
  const next = [...stack, value];
  return next.length > max ? next.slice(next.length - max) : next;
}

/** 그라운딩 출처 정리(중복 제거, 최대 8개, http(s)만) */
export function cleanSources(raw: { uri?: string; title?: string }[]): Source[] {
  const seen = new Set<string>();
  const out: Source[] = [];
  for (const s of raw) {
    const uri = s.uri ?? "";
    if (!/^https?:\/\//i.test(uri) || seen.has(uri)) continue;
    seen.add(uri);
    out.push({ uri, title: cleanLine(s.title || uri, 120) });
    if (out.length >= 8) break;
  }
  return out;
}

/** 파일 확장자 검사(참고·분석용 텍스트 파일만) */
export function isTextFileName(name: string): boolean {
  return /\.(txt|md|markdown|csv)$/i.test(name);
}

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/** 저장된 HTML을 평문으로(서버: 글자 수·제목 계산용). 태그를 지우고 문단 경계는 줄바꿈으로 바꾼다. 렌더링에는 쓰지 않는다. */
export function htmlToPlain(html: string): string {
  return String(html ?? "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|li|tr|blockquote|pre|table|ul|ol)>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, g: string) => {
      if (g[0] === "#") {
        const code = g[1].toLowerCase() === "x" ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
      }
      return NAMED[g.toLowerCase()] ?? m;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 본문에 들어 있는 이 프로그램 이미지 저장소(공개 버킷) 경로를 모은다(문서 삭제 시 정리용) */
export function imagePathsIn(content: string, bucket: string): string[] {
  const out = new Set<string>();
  const re = new RegExp(`/storage/v1/object/public/${bucket}/([A-Za-z0-9_./-]+)`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(content))) out.add(m[1]);
  return [...out];
}
