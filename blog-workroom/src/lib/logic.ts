// 계산 규칙(서버·화면·테스트 공용, 외부 호출 없음)

// ---- 키워드 등급: 블로그 문서수(검색 API 누적 문서수) ÷ 월간 검색량(낮을수록 경쟁이 적음) ----
// 기준은 2026-10-16 실측 분포(검색량 300 이상 연관어 30개: 2배~1,600배, 중간값 약 60배)로 정했다. 상위 약 1/4이 골드·실버.
export type Grade = "골드" | "실버" | "일반" | "경쟁" | "검색 적음";
export function keywordGrade(total: number, docs: number | null): { ratio: number | null; grade: Grade } {
  if (!total || total < 100) return { ratio: docs != null && total ? docs / total : null, grade: "검색 적음" };
  if (docs == null) return { ratio: null, grade: "일반" };
  const ratio = docs / total;
  if (ratio < 10 && total >= 1000) return { ratio, grade: "골드" };
  if (ratio < 30) return { ratio, grade: "실버" };
  if (ratio < 150) return { ratio, grade: "일반" };
  return { ratio, grade: "경쟁" };
}
export const GRADE_ORDER: Record<Grade, number> = { 골드: 0, 실버: 1, 일반: 2, 경쟁: 3, "검색 적음": 4 };

// ---- 검색어 급상승 판정: 최근 3일 평균이 직전 7일 평균보다 50% 이상 높고, 3일 중 2일 이상과 마지막 날이 기준을 넘는다 ----
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

// ---- 검수 결과의 "지적한 문장"이 실제 본문에 있는지 확인(없는 문장을 지적하면 버린다) ----
const norm = (s: string) => s.replace(/\s+/g, "").replace(/["'“”‘’「」]/g, "");
export function quoteInText(quote: string, text: string): boolean {
  const q = norm(quote);
  return q.length >= 4 && norm(text).includes(q);
}

// ---- 원문과 지나치게 같은 문장인지(연속 25자 이상 그대로면 같은 문장으로 본다) ----
export function copiesSource(sentence: string, sources: string[], run = 25): boolean {
  const s = norm(sentence);
  if (s.length < run) return false;
  const src = sources.map(norm);
  for (let i = 0; i + run <= s.length; i += 5) {
    const piece = s.slice(i, i + run);
    if (src.some((t) => t.includes(piece))) return true;
  }
  return false;
}

/** 본문 글자 수(공백 제외) */
export function charCount(text: string): number {
  return text.replace(/\s/g, "").length;
}

/** 초안 구간들을 하나의 글로 합친다(소제목 + 본문) */
export function joinSections(title: string, sections: { heading: string; body: string }[]): string {
  return [title, "", ...sections.flatMap((s) => [s.heading ? `■ ${s.heading}` : "", s.body, ""])].filter((x, i, a) => !(x === "" && a[i - 1] === "")).join("\n").trim();
}

/** 텍스트를 이미지 설명용 문단으로 나눈다(빈 줄 기준, 너무 짧은 줄은 앞 문단에 붙인다) */
export function splitParagraphs(text: string): string[] {
  const raw = text.replace(/\r/g, "").split(/\n\s*\n|\n(?=■)/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of raw) { if (out.length && p.length < 40) out[out.length - 1] += "\n" + p; else out.push(p); }
  return out;
}

/** 제안이 「…삭제하세요」 같은 지시문이면 본문에 넣지 않고 삭제 제안(빈 문자열)으로 바꾼다 */
export function asReplacement(s: string): string {
  // 본문 문장("불필요한 지방을 제거합니다.")은 남기고, 문장·단락을 지우라는 편집 지시만 걸러낸다
  return /(문장|단락|문단|부분|표현|내용)/.test(s) && /(삭제|지우|지워|제거|빼)/.test(s) && /(세요|합니다|하십시오|바랍니다)\.?$/.test(s) ? "" : s;
}
