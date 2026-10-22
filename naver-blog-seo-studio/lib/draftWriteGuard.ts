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
// 2026-10-23: 최종 발행 권한(arm)을 받기 전 「입력 중」에서 20분 넘게 멈춘 실행은 끝난 것으로 본다(최종 버튼은 누르지 않은 단계).
export const STALE_WRITING_MS = 20 * 60 * 1000;
export function staleWritingRun(run: DraftReport, now = Date.now()) {
  const startedAt = typeof run.startedAt === "string" ? Date.parse(run.startedAt) : NaN;
  return run.state === "writing" && Number.isFinite(startedAt) && now - startedAt > STALE_WRITING_MS;
}
// 「편집기로 입력만」 결과는 자동 포스팅 실행이 없거나, 실패했거나, 멈춘 실행일 때만 기록한다.
export const manualInputAllowed = (run: DraftReport, now = Date.now()) => !run.runId || run.state === "failed" || staleWritingRun(run, now);
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
