// 병합 B-6(콘텐츠 메이커 수정본 이력 → SEO 스튜디오): 원고 저장 때 바뀌기 전 제목·본문을 seo_report.revisions에 최근 10개까지 남기고,
// 문단 단위로 비교·되돌리기한다(콘텐츠 메이커는 옛 글 보기만 있었음). 실행 시점 import 없음(화면·서버·시험 공용). DB 변경 없음.
export interface DraftRevision { at: string; title: string; body: string; reason: string }
export const MAX_REVISIONS = 10;

export function readRevisions(value: unknown): DraftRevision[] {
  if (!Array.isArray(value)) return [];
  return value.filter((r): r is DraftRevision => Boolean(r) && typeof r === "object"
    && typeof (r as DraftRevision).at === "string" && typeof (r as DraftRevision).title === "string" && typeof (r as DraftRevision).body === "string")
    .slice(0, MAX_REVISIONS);
}

/** prev(바뀌기 전)와 next(저장할 글)가 다를 때만 prev를 맨 앞에 넣는다. 바로 앞 이력과 같은 글이면 다시 넣지 않는다. */
export function pushRevision(list: DraftRevision[], prev: { title: string; body: string }, next: { title: string; body: string }, reason: string, now = new Date().toISOString()): DraftRevision[] {
  if (prev.title === next.title && prev.body === next.body) return list;
  if (list[0] && list[0].title === prev.title && list[0].body === prev.body) return list;
  return [{ at: now, title: prev.title, body: prev.body, reason }, ...list].slice(0, MAX_REVISIONS);
}

export type DiffLine = { type: "same" | "add" | "del"; text: string };
const paras = (s: string) => s.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

/** 빈 줄 기준 문단을 LCS로 맞춰 그대로/추가/삭제를 표시한다(older → newer). 문단이 아주 많으면 앞 400개까지만 비교. */
export function diffParagraphs(older: string, newer: string): DiffLine[] {
  const a = paras(older).slice(0, 400), b = paras(newer).slice(0, 400);
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: DiffLine[] = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { out.push({ type: "same", text: a[i] }); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push({ type: "del", text: a[i++] });
    else out.push({ type: "add", text: b[j++] });
  }
  while (i < a.length) out.push({ type: "del", text: a[i++] });
  while (j < b.length) out.push({ type: "add", text: b[j++] });
  return out;
}
