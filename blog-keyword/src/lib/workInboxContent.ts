// U10 2차(2026-11-07): 분석 기록 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·구조 데이터).
// 순수 함수 — 본문은 화면의 「결과 복사」·Markdown 내려받기와 같은 toMarkdown(src/lib/kw/export.ts)을 쓴다. tests/work-inbox-content.test.mjs.
import { toMarkdown } from "./kw/export";
import { FEATURE_INFO, type AnalysisResult } from "./kw/types";

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

export function reportInboxContent(report: { keyword: string; created_at: string; result: AnalysisResult }): { title: string; bodyMd: string; data: Record<string, string> } {
  const feature = FEATURE_INFO.find((f) => f.id === report.result.kind)?.title ?? report.result.kind;
  const keyword = (report.keyword ?? "").trim();
  const day = kstDate(report.created_at);
  const title = `블로그 키워드 — ${feature}${keyword ? ` · ${keyword}` : ""}`.slice(0, 200);
  const data: Record<string, string> = { 기능: feature };
  if (keyword) data["키워드"] = keyword;
  if (day) data["분석일"] = day;
  return { title, bodyMd: toMarkdown(report.result).slice(0, 150_000), data };
}
