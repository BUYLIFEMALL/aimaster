// 순수 유틸(서버·클라이언트 공용). 외부 호출·비밀 값 없음 — 단위 테스트 대상.

/** 한국 시간 기준 오늘 날짜 정보(프롬프트에 항상 주입한다: 핵심 원칙 8번) */
export function todayKst(now: Date = new Date()): { year: number; ymd: string; label: string; month: number } {
  const k = new Date(now.getTime() + 9 * 3600_000);
  const year = k.getUTCFullYear();
  const month = k.getUTCMonth() + 1;
  const day = k.getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { year, month, ymd: `${year}-${pad(month)}-${pad(day)}`, label: `${year}년 ${month}월 ${day}일` };
}

/** 모든 AI 프롬프트 맨 앞에 붙이는 기준 연도 지침 */
export function yearGuard(now: Date = new Date()): string {
  const t = todayKst(now);
  return `[기준 연도 엄수: 현재 연도는 ${t.year}년이고 오늘은 ${t.label}입니다. 모든 연도 표기, 정책, 정보, 가이드, 제목은 반드시 ${t.year}년(당해 연도)을 기준으로 작성하세요. 과거 연도(2023년, 2024년 등)로 퇴행하지 마세요.]`;
}

/** 프롬프트 라이브러리의 {YYYY}·{YYYY+1}·{MM}·{keyword} 치환 */
export function fillTemplate(template: string, vars: { keyword?: string }, now: Date = new Date()): string {
  const t = todayKst(now);
  return template
    .replace(/\{YYYY\+1\}/g, String(t.year + 1))
    .replace(/\{YYYY\}/g, String(t.year))
    .replace(/\{MM\}/g, String(t.month))
    .replace(/\{keyword\}/g, vars.keyword ?? "");
}

/** 입력 키워드 정리: 앞뒤 공백·연속 공백·제어문자 제거, 길이 제한 */
export function cleanKeyword(raw: unknown, max = 60): string {
  return String(raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

const ENTITIES: Record<string, string> = { "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&#39;": "'", "&apos;": "'", "&nbsp;": " " };

/** 네이버 검색 응답의 <b> 태그·HTML 엔티티를 제거한다 */
export function stripHtml(s: unknown): string {
  return String(s ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/&(quot|amp|lt|gt|apos|nbsp|#39);/g, (m) => ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

/** 구글 검색 그라운딩 응답에 섞이는 인용 표기([1], [2, 3])를 제거한다 */
export function stripCitations(s: string): string {
  return s.replace(/\s*\[(?:\d+(?:\s*,\s*\d+)*)\]/g, "").replace(/[ \t]+\n/g, "\n");
}

/**
 * 모델 응답 텍스트에서 JSON 객체를 꺼낸다.
 * 코드 펜스·앞뒤 설명문이 섞여도 첫 '{'부터 짝이 맞는 '}'까지 잘라 파싱하고, 실패하면 null.
 */
export function parseJsonLoose(text: string | null | undefined): unknown {
  if (!text) return null;
  const t = stripCitations(String(text)).replace(/```(?:json)?/gi, "");
  const start = t.indexOf("{");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(t.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

// ---- 값 정규화 도우미(모델 응답은 형식이 어긋날 수 있으므로 모두 거친다) ----
export function str(v: unknown, max = 2000): string {
  if (typeof v === "string") return v.trim().slice(0, max);
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return "";
}

export function strArr(v: unknown, maxItems = 20, maxLen = 200): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => str(x, maxLen)).filter(Boolean).slice(0, maxItems);
}

export function num(v: unknown, min = 0, max = 100, fallback = 0): number {
  const digits = typeof v === "number" ? "" : String(v ?? "").replace(/[^0-9.\-]/g, "");
  if (typeof v !== "number" && !/\d/.test(digits)) return fallback;
  const n = typeof v === "number" ? v : Number(digits);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function objArr(v: unknown, maxItems = 20): Record<string, unknown>[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)).slice(0, maxItems);
}

export function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

// ---- 한글 자음 확장(자동완성) ----
export const JAMO = ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ", "ㅂ", "ㅅ", "ㅇ", "ㅈ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"];

/** 자동완성 조회용 접두어 목록: 원본 + (원본 + 자음 14개) */
export function autocompleteQueries(keyword: string): string[] {
  return ["", ...JAMO].map((j) => (j ? `${keyword} ${j}` : keyword));
}

/** 여러 자동완성 결과를 합쳐 중복·원본·너무 짧은 항목을 제거하고 상위 N개만 남긴다 */
export function mergeSuggestions(keyword: string, lists: string[][], limit = 20): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const base = keyword.replace(/\s+/g, "");
  for (const list of lists) {
    for (const raw of list) {
      const text = raw.replace(/\s+/g, " ").trim();
      const key = text.replace(/\s+/g, "");
      if (!text || key === base || seen.has(key)) continue;
      seen.add(key);
      out.push(text);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ---- 빈출 단어 계산(카테고리 트렌드) ----
const STOPWORDS = new Set([
  "그리고", "하지만", "그래서", "이번", "오늘", "방법", "추천", "후기", "정리", "총정리", "완벽", "가이드", "이유", "사용", "정말", "진짜",
  "대한", "위한", "관련", "있는", "없는", "하는", "되는", "에서", "으로", "까지", "부터", "입니다", "합니다", "해보기", "알아보기", "알아보자",
  "꿀팁", "리뷰", "내돈내산", "블로그", "포스팅", "공유", "소개", "비교", "top", "best",
  "확인", "구매", "정보", "사항", "고를", "가능", "제품", "상품", "판매", "가격", "할인", "최저가", "무료", "이벤트", "방문", "오늘의", "정답",
  "필수", "기본", "종류", "특징", "장점", "단점", "선택", "기준", "항목", "내용", "경우", "때문", "이상", "이하", "관련된", "대해",
]);

/** 제목들에서 2글자 이상 단어 빈도를 센다. exclude에 든 단어(분야명·키워드 자체)는 뺀다. */
export function frequentWords(titles: string[], exclude: string[] = [], limit = 10): { word: string; count: number }[] {
  const ex = new Set(exclude.flatMap((e) => e.split(/\s+/)).map((w) => w.toLowerCase()).filter(Boolean));
  const counts = new Map<string, number>();
  for (const title of titles) {
    const words = new Set(
      (title.match(/[가-힣A-Za-z0-9]{2,}/g) ?? [])
        .map((w) => (w.length >= 4 ? w.replace(/(은|는|이|가|을|를|의|에|도|로|과|와)$/u, "") : w))
        .map((w) => w.toLowerCase())
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w) && !ex.has(w) && !/^\d+(월|일|년|개|원|%)?$/.test(w)),
    );
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

/** 추이 변화율: 최근 4개 구간 평균 vs 직전 4개 구간 평균(%). 계산 불가면 null */
export function trendDelta(data: { ratio: number }[]): number | null {
  if (data.length < 8) return null;
  const avg = (a: { ratio: number }[]) => a.reduce((s, p) => s + p.ratio, 0) / a.length;
  const recent = avg(data.slice(-4));
  const prev = avg(data.slice(-8, -4));
  if (prev <= 0) return recent > 0 ? 100 : null;
  return Math.round(((recent - prev) / prev) * 100);
}
