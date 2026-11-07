// U10 2차(2026-11-07): 경쟁사 분석 결과 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·구조 데이터).
// 순수 함수(가져오기 없음) — tests/work-inbox-content.mjs. 분석 결과는 캘린더가 아니라 「페이지로 만들기」로 받는다.

export interface AnalysisForInbox {
  keyword: string;
  summaryText: string;
  createdAt: string;
  totalResults?: number | null;
  topResults?: { position: number | null; title: string | null; domain: string | null; link: string | null }[];
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

export interface ExpandForInbox {
  seedKeyword: string;
  executedAt: string;
  summaryText: string | null;
  related: { id: string; keyword: string; relevance_score: number | null }[];
  expansions: { keyword: string; related_id: string | null }[];
}

/** 키워드 확장(옛 롱테일) 실행 한 건 → 연관 키워드(관련도)와 롱테일 목록 + 작업 지시문 */
export function expandInboxContent(e: ExpandForInbox): { title: string; bodyMd: string; data: Record<string, string | number> } {
  const seed = e.seedKeyword.trim() || "키워드";
  const day = kstDate(e.executedAt);
  const title = `키워드 확장 — ${seed}${day ? ` (${day})` : ""}`.slice(0, 200);
  const byRelated = new Map<string | null, string[]>();
  for (const x of e.expansions) byRelated.set(x.related_id, [...(byRelated.get(x.related_id) ?? []), x.keyword]);

  const lines = [`씨드 키워드 「${seed}」에서 찾은 연관·롱테일 키워드입니다.`];
  if (e.summaryText?.trim()) lines.push("", "## 작업 지시문", e.summaryText.trim());
  const direct = byRelated.get(null) ?? [];
  if (direct.length) lines.push("", "## 씨드 직속 롱테일", ...direct.map((k) => `- ${k}`));
  if (e.related.length) {
    lines.push("", "## 연관 키워드");
    for (const r of e.related) {
      const pct = r.relevance_score === null ? "" : ` (관련도 ${Math.round(r.relevance_score * 100)}%)`;
      const kids = byRelated.get(r.id) ?? [];
      lines.push(`- ${r.keyword}${pct}${kids.length ? ` → ${kids.join(", ")}` : ""}`);
    }
  }
  const data: Record<string, string | number> = { 키워드: seed, "연관 키워드 수": e.related.length, "롱테일 수": e.expansions.length };
  if (day) data["분석일"] = day;
  return { title, bodyMd: lines.join("\n").slice(0, 100_000), data };
}

export function analysisInboxContent(a: AnalysisForInbox): { title: string; bodyMd: string; data: Record<string, string | number> } {
  const keyword = a.keyword.trim() || "키워드";
  const day = kstDate(a.createdAt);
  const title = `경쟁사 분석 — ${keyword}${day ? ` (${day})` : ""}`.slice(0, 200);

  const lines = [`키워드 「${keyword}」 검색 상위 경쟁사 분석 리포트입니다.`, "", a.summaryText.trim() || "(분석 내용 없음)"];
  const top = (a.topResults ?? []).filter((r) => r.title || r.domain).slice(0, 10);
  if (top.length) {
    lines.push("", "## 상위 검색결과");
    for (const r of top) {
      const name = (r.title ?? r.domain ?? "").replace(/[[\]]/g, "").trim();
      const label = r.link && /^https?:\/\//.test(r.link) ? `[${name}](${r.link})` : name;
      lines.push(`- ${r.position ?? "-"}위 ${label}${r.domain ? ` · ${r.domain}` : ""}`);
    }
  }
  const data: Record<string, string | number> = { 키워드: keyword };
  if (day) data["분석일"] = day;
  if (typeof a.totalResults === "number") data["검색결과 수"] = a.totalResults;
  return { title, bodyMd: lines.join("\n").slice(0, 100_000), data };
}
