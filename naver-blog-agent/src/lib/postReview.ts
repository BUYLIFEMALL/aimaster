import { createHash } from "node:crypto";
import { postReviewSnapshot } from "./postReviewSnapshot";

export type ReviewStatus = "PASS" | "WARN" | "FAIL" | "UNKNOWN" | "CONFIRMED";
export interface ReviewedPost { blog_id?: unknown; title?: unknown; content?: unknown; tags?: unknown; images?: unknown; research_summary?: unknown }
const record = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === "object" && !Array.isArray(value));
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.keys(value).sort().filter(key=>value[key]!==undefined).map(key=>[key,canonical(value[key])]));
  return value;
}
export function reviewFingerprint(post: ReviewedPost): string {
  return createHash("sha256").update(postReviewSnapshot(post)).digest("hex");
}
export function withPostReview(summary: unknown, review: {status: ReviewStatus; source: "ai" | "manual"; note: string; fingerprint: string; checkedAt: string}) {
  const previous=record(summary)?summary:summary==null?{}:{original_summary:summary};
  const aiReview=review.source==="manual" && record(previous.review) && previous.review.source==="ai"?previous.review:null;
  return {...previous,...(aiReview?{ai_review:aiReview}:{}),review};
}
export function getPostReview(post: ReviewedPost) {
  const summary=record(post.research_summary)?post.research_summary:null;
  const review=summary && record(summary.review)?summary.review:null;
  const fingerprint=reviewFingerprint(post);
  const matched=review?.fingerprint===fingerprint;
  const state=!review?"UNREVIEWED":!matched?"STALE":String(review.status || "UNKNOWN");
  const ai=summary && record(summary.ai_review)?summary.ai_review:review?.source==="ai"?review:null;
  return {state,allowed:matched && (state==="PASS" || state==="CONFIRMED"),aiStatus:ai?.status || null,aiNote:typeof ai?.note==="string"?ai.note:null,
    note:typeof review?.note==="string"?review.note:"검수 기록이 없습니다. 저장한 최종 원고를 직접 확인해 주세요.",
    source:review?.source==="ai"?"ai":"manual",checkedAt:typeof review?.checkedAt==="string"?review.checkedAt:null,fingerprint};
}
export const AUTHORING_FIELDS=["blog_id","title","content","tags","images","publish_visibility","scheduled_at"] as const;
export function changesAuthoring(current: Record<string, unknown>, patch: Record<string, unknown>) {
  return AUTHORING_FIELDS.some(key=>patch[key]!==undefined && JSON.stringify(canonical(patch[key]))!==JSON.stringify(canonical(current[key])));
}
