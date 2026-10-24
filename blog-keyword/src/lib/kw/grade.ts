// 블로그 병합 묶음 C(2026-10-24): 작업실(blog-workroom src/lib/logic.ts·actions/trend.ts)의 키워드 등급·급상승 판정을 옮기고,
// 도톨이 v1.3 기능 참고(N8 새 글만 분석·최근 활동 계정, N9 수치 조회 전 주제 판정 재사용)를 순수 함수로 더했다. 외부 호출 없음(서버·화면·시험 공용).

export type Grade = "골드" | "실버" | "일반" | "경쟁" | "검색 적음";
export const GRADES: Grade[] = ["골드", "실버", "일반", "경쟁", "검색 적음"];
export const GRADE_ORDER: Record<Grade, number> = { 골드: 0, 실버: 1, 일반: 2, 경쟁: 3, "검색 적음": 4 };

/** 문서 수 ÷ 월 검색량(실측 숫자만으로 정함). 검색 100 미만은 「검색 적음」, 문서 수를 못 읽으면 「일반」. */
export function keywordGrade(total: number, docs: number | null): { ratio: number | null; grade: Grade } {
  if (!total || total < 100) return { ratio: docs != null && total ? docs / total : null, grade: "검색 적음" };
  if (docs == null) return { ratio: null, grade: "일반" };
  const ratio = docs / total;
  if (ratio < 10 && total >= 1000) return { ratio, grade: "골드" };
  if (ratio < 30) return { ratio, grade: "실버" };
  if (ratio < 150) return { ratio, grade: "일반" };
  return { ratio, grade: "경쟁" };
}

export interface KeywordMetric { keyword: string; pc: number; mobile: number; total: number; docs: number | null; ratio: number | null; grade: Grade; compIdx: string | null }

export function sortMetrics(m: KeywordMetric[]): KeywordMetric[] {
  return [...m].sort((a, b) => GRADE_ORDER[a.grade] - GRADE_ORDER[b.grade] || b.total - a.total);
}

/** 급상승: 최근 3일 평균이 직전 7일 평균보다 50% 이상 높고, 3일 중 2일 이상·마지막 날이 직전 평균보다 높음. 10일 미만이면 판정 안 함. */
export function surge(series: number[]): { surging: boolean; recent: number; base: number; change: number | null } {
  if (series.length < 10) return { surging: false, recent: 0, base: 0, change: null };
  const last10 = series.slice(-10);
  const base7 = last10.slice(0, 7), recent3 = last10.slice(7);
  const base = base7.reduce((a, b) => a + b, 0) / 7;
  const recent = recent3.reduce((a, b) => a + b, 0) / 3;
  if (base <= 0) return { surging: recent > 0, recent, base, change: null };
  const change = (recent - base) / base;
  const above = recent3.filter((v) => v > base).length;
  return { surging: change >= 0.5 && above >= 2 && recent3[2] > base, recent, base, change };
}

/** 데이터랩 날짜별 값(빠진 날 0). 최근 1~2일은 아직 집계되지 않아 비어 있으므로 집계된 마지막 날까지만 쓴다(0으로 채우면 모두 하락으로 보임). */
export function fillDays(data: { period: string; ratio: number }[], start: Date, days: number): number[] {
  const map = new Map(data.map((d) => [d.period, d.ratio]));
  const last = data.reduce((m, d) => (d.period > m ? d.period : m), "");
  const out: number[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
    if (last && day > last) break;
    out.push(map.get(day) ?? 0);
  }
  return out;
}

export const keyNorm = (s: string) => String(s ?? "").replace(/\s+/g, "").toLowerCase();

/** N9: 같은 주제의 판정은 6시간 동안 다시 쓴다. at = 판정한 시각(ISO). */
export const JUDGE_REUSE_MS = 6 * 3600_000;
export function judgeFresh(at: string | undefined, now = Date.now()): boolean {
  const t = at ? Date.parse(at) : NaN;
  return Number.isFinite(t) && now - t >= 0 && now - t < JUDGE_REUSE_MS;
}

/** N8: 검색 결과 글 날짜(yyyymmdd)가 기준일로부터 7일 안인가. */
export function postedWithinDays(postdate: string | undefined, days = 7, now = new Date()): boolean {
  const m = String(postdate ?? "").match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return false;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const k = new Date(now.getTime() + 9 * 3600_000); // 한국 날짜
  const kstToday = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
  return kstToday - t <= days * 86_400_000 && kstToday - t >= 0;
}

/** N8: 지난번 분석한 글 번호를 빼고 새 글만(최신순 유지, 최대 max). */
export function pickNewPosts<T extends { logNo: string }>(posts: T[], seen: string[] | undefined, max = 10): T[] {
  const s = new Set(seen ?? []);
  return posts.filter((p) => !s.has(p.logNo)).slice(0, max);
}

/** 주제 입력 「캠핑, 차박」 → 최대 3개(중복·빈 값 제외) */
export function splitTopics(raw: string, max = 3): string[] {
  return [...new Set(String(raw).split(/[,，、\n]/).map((s) => s.trim()).filter((s) => s.length >= 1 && s.length <= 40))].slice(0, max);
}
