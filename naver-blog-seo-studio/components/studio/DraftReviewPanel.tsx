"use client";

// 병합 B-1(작업실 → SEO 스튜디오): 원고 AI 검수 6영역 카드. 회원이 누를 때만 본인 키로 1회 호출.
// 현재 글에 「필수」 지적이 남아 있으면 확장 넘기기·자동 포스팅·편집기 입력이 서버에서 막힌다(검수는 선택).
import { useState } from "react";
import { readReview, reviewState, REVIEW_AREAS } from "@/lib/draftReview";
import type { DraftRecord } from "./shared";

const STATE_TEXT = {
  none: { label: "검수 전", tone: "muted", text: "검수는 선택입니다. 하지 않아도 발행할 수 있습니다." },
  stale: { label: "다시 검수 필요", tone: "warn", text: "검수한 뒤 글이 바뀌었습니다. 고친 글을 저장한 뒤 다시 검수해 주세요." },
  must: { label: "필수 수정 남음", tone: "bad", text: "필수 지적을 고치기 전에는 발행(확장 넘기기·자동 포스팅)이 막힙니다." },
  ok: { label: "검수 통과", tone: "good", text: "필수 지적이 없습니다. 권장 사항은 참고해 주세요." },
} as const;

export function DraftReviewPanel({ draft, provider, model, onReviewed }: {
  draft: DraftRecord; provider: string; model: string; onReviewed: (seoReport: Record<string, unknown>) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const report = (draft.seo_report ?? null) as Record<string, unknown> | null;
  const review = readReview(report?.review);
  const state = reviewState(report, draft.title, draft.body);
  const info = STATE_TEXT[state];
  const mustCount = review?.issues.filter((issue) => issue.level === "필수").length ?? 0;

  const run = async () => {
    if (busy || !draft.id) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/review`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "AI 검수에 실패했습니다.");
      onReviewed(data.seoReport);
      const count = data.review?.issues?.length ?? 0;
      setMessage({ text: count ? `검수했습니다. 지적 ${count}건을 확인해 주세요.` : "검수했습니다. 지적 사항이 없습니다.", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "AI 검수에 실패했습니다.", ok: false });
    } finally { setBusy(false); }
  };

  return (
    <section className="quality-panel card" aria-labelledby="draft-review-title">
      <div className="card-head">
        <div>
          <h2 id="draft-review-title" className="card-title">AI 검수 (6영역)</h2>
          <p className="draft-result-subtitle">점검 영역: {REVIEW_AREAS.join(" · ")}. 저장된 원고를 본인 AI 키로 1회 검수합니다. 고친 내용이 있으면 먼저 저장해 주세요.</p>
        </div>
        <span className={`quality-score ${info.tone === "good" ? "good" : "low"}`}>{info.label}{state === "must" ? ` ${mustCount}건` : ""}</span>
      </div>
      <p className="draft-result-subtitle">{info.text}</p>
      {review && state !== "none" && (
        <>
          {review.summary && <p className="draft-result-subtitle">{review.summary}</p>}
          {review.issues.length ? (
            <ul className="quality-check-list">
              {review.issues.map((issue, index) => (
                <li key={index} className={`quality-check ${issue.level === "필수" ? "warn" : "skip"}`}>
                  <span aria-hidden="true">{issue.level === "필수" ? "❗" : "💡"}</span>
                  <strong>[{issue.level}] {issue.area}</strong>
                  <small>「{issue.quote}」 — {issue.reason}{issue.suggestion ? ` → 고친 문장: ${issue.suggestion}` : issue.level === "필수" ? " → 이 문장을 지우는 것을 권합니다." : ""}</small>
                </li>
              ))}
            </ul>
          ) : <p className="quality-empty">지적 사항이 없습니다.</p>}
          <p className="draft-result-subtitle">검수 시각 {new Date(review.at).toLocaleString("ko-KR")}{review.model ? ` · ${review.model}` : ""}</p>
        </>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="secondary compact" disabled={busy || !draft.id} onClick={() => void run()}>
          {busy ? "검수하는 중…(1분 내외)" : review ? "현재 원고 다시 검수" : "AI 검수하기"}
        </button>
      </div>
      {message && <p role="status" className={message.ok ? "draft-result-subtitle" : "experience-question-error"}>{message.text}</p>}
    </section>
  );
}
