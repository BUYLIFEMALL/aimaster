// AI 응답 정리·검증 순수 함수 (서버·테스트 공용)
import {
  LIMITS, DEFAULT_LYRICS_OPTIONS, LANGS, imageModelById, textModelById,
  type LyricsOptions, type MetaResult, type SunoVariant, type UsageInfo,
} from "./types";

/** 모델이 코드블록 등을 섞어 보내도 JSON만 꺼낸다. 실패하면 null */
export function extractJson(text: string): unknown | null {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try { return JSON.parse(t); } catch { /* 아래에서 중괄호 구간을 찾아본다 */ }
  const starts = [t.indexOf("{"), t.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const end = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (end <= start) return null;
  try { return JSON.parse(t.slice(start, end + 1)); } catch { return null; }
}

const TITLE_RE = /^playlist\s+(\S+)\s+(.+?)\s*\|\s*(.+?)\s*&\s*(.+)$/i;

/** 제목이 "playlist [이모지] [문장] | [키워드] & [키워드]" 형식인지 */
export function isValidTitle(t: string): boolean {
  return TITLE_RE.test(t.trim());
}

/** 형식이 약간 어긋난 제목을 최대한 바로잡는다. 고칠 수 없으면 null */
export function normalizeTitle(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let t = raw.replace(/\s+/g, " ").trim().replace(/^["'`]+|["'`]+$/g, "");
  if (!t) return null;
  if (!/^playlist\b/i.test(t)) t = `playlist ${t}`;
  t = t.replace(/^playlist/i, "playlist");
  t = t.replace(/\s*\|\s*/g, " | ").replace(/\s*&\s*/g, " & ");
  return isValidTitle(t) ? t : null;
}

/** 제목 배열을 정리한다: 형식 검증·중복 제거·최대 개수 */
export function cleanTitles(raw: unknown, max = LIMITS.titleCount): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const t = normalizeTitle(typeof item === "string" ? item : (item as { title?: unknown })?.title);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/** 제목에서 표시용 요소를 뽑는다 */
export function parseTitle(t: string): { emoji: string; sentence: string; k1: string; k2: string } | null {
  const m = t.trim().match(TITLE_RE);
  return m ? { emoji: m[1], sentence: m[2], k1: m[3], k2: m[4] } : null;
}

/** Suno 프롬프트 변형 정리: 최대 3개, 각 style은 900자 미만 */
export function cleanSuno(raw: unknown): SunoVariant[] {
  const list = Array.isArray(raw) ? raw : (raw as { variants?: unknown })?.variants;
  if (!Array.isArray(list)) return [];
  const out: SunoVariant[] = [];
  for (const v of list) {
    const o = v as Record<string, unknown>;
    const style = typeof o?.style === "string" ? o.style.trim() : "";
    if (!style) continue;
    out.push({
      name: (typeof o.name === "string" && o.name.trim()) || `변형 ${out.length + 1}`,
      style: clampChars(style, LIMITS.sunoMaxChars - 1),
      note: typeof o.note === "string" ? o.note.trim() : "",
    });
    if (out.length >= 3) break;
  }
  return out;
}

/** 글자 수를 넘기면 마지막 쉼표 앞에서 자른다 */
export function clampChars(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const comma = cut.lastIndexOf(",");
  return (comma > max * 0.6 ? cut.slice(0, comma) : cut).trim();
}

/** 해시태그 정리: #playlist 가 맨 앞, 정확히 5개, 공백 제거 */
export function cleanHashtags(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>(["#playlist"]);
  const out = ["#playlist"];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const tag = "#" + item.trim().replace(/^#+/, "").replace(/\s+/g, "");
    if (tag.length < 2 || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(tag);
    if (out.length >= LIMITS.hashtags) break;
  }
  return out;
}

export function cleanKeywords(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    if (typeof item !== "string") continue;
    const k = item.trim().replace(/^#+/, "");
    if (!k || seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
    if (out.length >= LIMITS.keywords) break;
  }
  return out;
}

export function cleanMeta(raw: unknown): MetaResult | null {
  const o = raw as Record<string, unknown> | null;
  const description = typeof o?.description === "string" ? o.description.trim() : "";
  if (!description) return null;
  return { description, hashtags: cleanHashtags(o?.hashtags), keywords: cleanKeywords(o?.keywords) };
}

/** 가사 옵션을 허용 범위로 맞춘다 */
export function cleanLyricsOptions(raw: unknown): LyricsOptions {
  const o = (raw ?? {}) as Partial<LyricsOptions>;
  const D = DEFAULT_LYRICS_OPTIONS;
  const lang = (v: unknown, fallback: string) => (typeof v === "string" && LANGS.some((l) => l.id === v) ? v : fallback);
  const language = lang(o.language, D.language);
  const second = typeof o.secondLanguage === "string" && o.secondLanguage !== language ? lang(o.secondLanguage, "") : "";
  const num = (v: unknown, lo: number, hi: number, d: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
  };
  const metaphor = num(o.metaphor, 1, 4, D.metaphor) as 1 | 2 | 3 | 4;
  return {
    language,
    secondLanguage: second,
    secondRatio: num(o.secondRatio, 10, 90, D.secondRatio),
    songCount: num(o.songCount, LIMITS.songsMin, LIMITS.songsMax, D.songCount),
    metaphor,
    structure: typeof o.structure === "string" && o.structure ? o.structure : D.structure,
    intro: !!o.intro,
    outro: !!o.outro,
    instrumental: !!o.instrumental,
    theme: typeof o.theme === "string" ? o.theme.trim().slice(0, 300) : "",
  };
}

/** 곡 목록을 batchSize 개씩 나눈다 */
export function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** 호출 비용(달러). 모르는 모델이면 0 */
export function estimateCost(u: UsageInfo): number {
  const t = textModelById(u.model);
  if (t) return (u.inputTokens * t.inPer1M + u.outputTokens * t.outPer1M) / 1_000_000;
  const i = imageModelById(u.model);
  if (i) return (u.images ?? 1) * i.perImage;
  return 0;
}

/** 썸네일에 얹을 글자 줄바꿈 계산용: 최대 폭에 맞춰 단어/글자 단위로 나눈다 */
export function wrapLines(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      if ((line + word).length > maxChars && line.trim()) {
        out.push(line.trim());
        line = word.trimStart();
      } else line += word;
    }
    if (line.trim()) out.push(line.trim());
  }
  return out;
}
