"use client";

// 병합 B-1(작업실 → SEO 스튜디오): 원고 AI 검수 카드. 회원이 누를 때만 본인 키로 1회 호출.
// 현재 글에 「필수」 지적이 남아 있으면 확장 넘기기·자동 포스팅·편집기 입력이 서버에서 막힌다(검수는 선택).
// D-3 (2026-10-24): 지적 반영 — 지적마다 반영(작업실 「제안 반영」 이관) + 한 번에 반영 후 자동 다시 검수 1회·전후 비교.
// 반영은 AI 호출 없이 화면에서 본문을 바꾸고, 되돌리기와 같은 저장 경로로 저장한다(바꾸기 전 글은 수정 이력에 남음).
import { useState } from "react";
import { applyReviewFixes, readReview, reviewState, REVIEW_AREAS, type ReviewIssue } from "@/lib/draftReview";
import type { DraftRecord } from "./shared";

const STATE_TEXT = {
  none: { label: "검수 전", tone: "muted", text: "검수는 선택입니다. 하지 않아도 발행할 수 있습니다." },
  stale: { label: "다시 검수 필요", tone: "warn", text: "검수한 뒤 글이 바뀌었습니다. 고친 글을 저장한 뒤 다시 검수해 주세요." },
  must: { label: "필수 수정 남음", tone: "bad", text: "필수 지적을 고치기 전에는 발행(확장 넘기기·자동 포스팅)이 막힙니다." },
  ok: { label: "검수 통과", tone: "good", text: "필수 지적이 없습니다. 권장 사항은 참고해 주세요." },
} as const;

type Counts = { must: number; rec: number };
const countOf = (issues: ReviewIssue[]): Counts => ({ must: issues.filter((i) => i.level === "필수").length, rec: issues.filter((i) => i.level !== "필수").length });

export function DraftReviewPanel({ draft, provider, model, onReviewed, onApplyFix }: {
  draft: DraftRecord; provider: string; model: string; onReviewed: (seoReport: Record<string, unknown>) => void;
  onApplyFix?: (body: string) => Promise<{ draft?: DraftRecord; error?: string }>;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [compare, setCompare] = useState<{ before: Counts; after: Counts } | null>(null);
  const [applied, setApplied] = useState<{ at: string; list: number[] }>({ at: "", list: [] });
  const report = (draft.seo_report ?? null) as Record<string, unknown> | null;
  const review = readReview(report?.review);
  const state = reviewState(report, draft.title, draft.body);
  const info = STATE_TEXT[state];
  const mustCount = review?.issues.filter((issue) => issue.level === "필수").length ?? 0;
  const appliedNow = review && applied.at === review.at ? applied.list : [];

  const requestReview = async () => {
    const response = await fetch(`/api/drafts/${draft.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "AI 검수에 실패했습니다.");
    onReviewed(data.seoReport);
    return (data.review?.issues ?? []) as ReviewIssue[];
  };

  const run = async () => {
    if (busy || !draft.id) return;
    setBusy(true); setMessage(null); setCompare(null);
    try {
      const issues = await requestReview();
      setMessage({ text: issues.length ? `검수했습니다. 지적 ${issues.length}건을 확인해 주세요.` : "검수했습니다. 지적 사항이 없습니다.", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "AI 검수에 실패했습니다.", ok: false });
    } finally { setBusy(false); }
  };

  const apply = async (indexes: number[], thenReview: boolean) => {
    if (busy || !review || !onApplyFix) return;
    const result = applyReviewFixes(draft.body, review.issues, indexes.filter((i) => !appliedNow.includes(i)));
    const skippedText = result.skipped.length ? ` 건너뛴 ${result.skipped.length}건: ${result.skipped.map((s) => `${s.index + 1}번 ${s.reason}`).join(" / ")}` : "";
    if (!result.applied.length) return setMessage({ text: `반영할 수 있는 지적이 없습니다.${skippedText}`, ok: false });
    if (thenReview && !window.confirm(`지적 ${result.applied.length}건을 본문에 반영하고 다시 검수할까요?\n바꾸기 전 글은 수정 이력에 남아 되돌릴 수 있습니다. 다시 검수는 본인 AI 키로 1회 호출합니다.`)) return;
    setBusy(true); setMessage(null); setCompare(null);
    try {
      const saved = await onApplyFix(result.body);
      if (saved.error) throw new Error(saved.error);
      setApplied({ at: review.at, list: [...appliedNow, ...result.applied] });
      if (!thenReview) {
        setMessage({ text: `${result.applied.length}건을 반영해 저장했습니다. 다 고친 뒤 다시 검수해 주세요.${skippedText}`, ok: true });
        return;
      }
      const before = countOf(review.issues);
      const after = countOf(await requestReview());
      setCompare({ before, after });
      setMessage({ text: after.must > before.must
        ? `반영 뒤 필수 지적이 늘었습니다(${before.must} → ${after.must}건). 아래 「수정 이력」에서 「검수 반영 전」 글로 되돌리는 것을 먼저 권합니다.${skippedText}`
        : `${result.applied.length}건을 반영하고 다시 검수했습니다.${skippedText}`, ok: after.must <= before.must });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "지적을 반영하지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  };

  const issues = review?.issues ?? [];
  const mustIndexes = issues.map((x, i) => (x.level === "필수" ? i : -1)).filter((i) => i >= 0);
  const allIndexes = issues.map((_, i) => i);
  const canApply = Boolean(onApplyFix && review && issues.length && state !== "none");

  return (
    <section className="quality-panel card" aria-labelledby="draft-review-title">
      <div className="card-head">
        <div>
          <h2 id="draft-review-title" className="card-title">AI 검수 ({REVIEW_AREAS.length}영역)</h2>
          <p className="draft-result-subtitle">점검 영역: {REVIEW_AREAS.join(" · ")}. 저장된 원고를 본인 AI 키로 1회 검수합니다. 고친 내용이 있으면 먼저 저장해 주세요.</p>
        </div>
        <span className={`quality-score ${info.tone === "good" ? "good" : "low"}`}>{info.label}{state === "must" ? ` ${mustCount}건` : ""}</span>
      </div>
      <p className="draft-result-subtitle">{info.text}</p>
      {review && state !== "none" && (
        <>
          {review.summary && <p className="draft-result-subtitle">{review.summary}</p>}
          {issues.length ? (
            <ul className="quality-check-list">
              {issues.map((issue, index) => (
                <li key={index} className={`quality-check ${issue.level === "필수" ? "warn" : "skip"}`}>
                  <span aria-hidden="true">{issue.level === "필수" ? "❗" : "💡"}</span>
                  <strong>{index + 1}. [{issue.level}] {issue.area}</strong>
                  <small>「{issue.quote}」 — {issue.reason}{issue.suggestion ? ` → 고친 문장: ${issue.suggestion}` : issue.level === "필수" ? " → 이 문장을 지우는 것을 권합니다." : ""}</small>
                  {onApplyFix && (appliedNow.includes(index)
                    ? <small className="draft-result-subtitle">✔ 반영함</small>
                    : <button type="button" className="text-button" disabled={busy} onClick={() => void apply([index], false)}>{issue.suggestion ? "이 지적 반영" : "이 문장 삭제"}</button>)}
                </li>
              ))}
            </ul>
          ) : <p className="quality-empty">지적 사항이 없습니다.</p>}
          <p className="draft-result-subtitle">검수 시각 {new Date(review.at).toLocaleString("ko-KR")}{review.model ? ` · ${review.model}` : ""}</p>
        </>
      )}
      {compare && (
        <p className="draft-result-subtitle" role="status">
          고치기 전 필수 {compare.before.must}건 · 권장 {compare.before.rec}건 → 고친 뒤 필수 {compare.after.must}건 · 권장 {compare.after.rec}건
        </p>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
        <button type="button" className="secondary compact" disabled={busy || !draft.id} onClick={() => void run()}>
          {busy ? "처리하는 중…(1분 내외)" : review ? "현재 원고 다시 검수" : "AI 검수하기"}
        </button>
        {canApply && mustIndexes.length > 0 && <button type="button" className="secondary compact" disabled={busy} onClick={() => void apply(mustIndexes, true)}>필수만 반영하고 다시 검수</button>}
        {canApply && <button type="button" className="secondary compact" disabled={busy} onClick={() => void apply(allIndexes, true)}>필수+권장 반영하고 다시 검수</button>}
      </div>
      {canApply && <p className="draft-result-subtitle">지적한 문장이 본문에 딱 한 곳 있을 때만 바꿉니다. 바꾸기 전 글은 「수정 이력」에 「검수 반영 전」으로 남습니다.</p>}
      {message && <p role="status" className={message.ok ? "draft-result-subtitle" : "experience-question-error"}>{message.text}</p>}
    </section>
  );
}
