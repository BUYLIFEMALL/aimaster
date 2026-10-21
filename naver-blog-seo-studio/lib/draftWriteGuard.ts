import { randomUUID, createHash } from "node:crypto";

export type DraftReport = Record<string, unknown>;
export function draftReport(value: unknown): DraftReport {
  return value && typeof value === "object" && !Array.isArray(value) ? value as DraftReport : {};
}
type Filter<T> = { eq(column: string, value: unknown): T; is(column: string, value: null): T };
export function matchDraftRevision<T extends Filter<T>>(query: T, report: DraftReport): T {
  return typeof report.saveRevision === "string"
    ? query.eq("seo_report->>saveRevision", report.saveRevision)
    : query.is("seo_report->>saveRevision", null);
}
export function writableDraft<T extends Filter<T>>(query: T, report: DraftReport): T {
  return matchDraftRevision(query, report).is("seo_report->autoPublish->>runId", null);
}
export function nextDraftReport(report: DraftReport, changes: DraftReport = {}): DraftReport {
  return { ...report, ...changes, saveRevision: randomUUID() };
}
export const draftLocked = (report: DraftReport) => Boolean(draftReport(report.autoPublish).runId);
export function publicationFingerprint(row: Record<string, unknown>) {
  const report = draftReport(row.seo_report);
  return createHash("sha256").update(JSON.stringify([
    row.title, row.body, row.image_path, row.image_model, row.image_mime_type,
    report.contentBlocks ?? null, report.contentImages ?? null, row.naver_category ?? null,
  ])).digest("hex");
}
export function naverPostUrl(value: unknown, blogId: string): string | null {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" || url.hostname !== "blog.naver.com" || url.username || url.password || url.port) return null;
    const direct = url.pathname.match(/^\/([A-Za-z0-9_-]+)\/(\d+)\/?$/);
    const logNo = direct?.[1] === blogId ? direct[2]
      : url.pathname === "/PostView.naver" && url.searchParams.get("blogId") === blogId ? url.searchParams.get("logNo") : null;
    return logNo && /^\d{6,20}$/.test(logNo) ? `https://blog.naver.com/${blogId}/${logNo}` : null;
  } catch { return null; }
}
