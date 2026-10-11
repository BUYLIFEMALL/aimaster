import { createHash } from "node:crypto";
import { stableJson } from "./postReviewSnapshot";
import { publicPost } from "./executionRuns";

export const SAVE_CONFLICT = "다른 탭 또는 작업에서 원고가 변경됐습니다. 편집 내용을 복사해 보관한 뒤 보관함에서 최신 원고를 다시 열어 비교해 주세요.";
export const SAVE_UPGRADE = "최신 원고를 다시 열어 저장해 주세요. 현재 편집 내용은 복사해 보관해 주세요.";
export const saveUuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = (value: unknown) => createHash("sha256").update(stableJson(value)).digest("hex");
const record = (value: any): Record<string, any> => value && typeof value === "object" && !Array.isArray(value) ? value : {};
const fields = ["blog_id", "category_name", "title", "content", "tags", "images", "status", "publish_visibility", "scheduled_at", "post_url", "error_message"];
export function postSaveRevision(row: any) {
  return hash({ ...Object.fromEntries(fields.map(key => [key, row[key] ?? null])),
    requestId: record(record(row.research_summary).draft_save).requestId ?? null,
    publishing: record(row.research_summary).naver_publishing ?? null });
}
export const savedPost = (row: any) => ({ ...publicPost(row), save_revision: postSaveRevision(row) });
export function saveFingerprint(method: string, payload: Record<string, any>) {
  return hash({method, id: payload.id, create: payload.create === true, expected_revision: payload.expected_revision,
    ...Object.fromEntries(fields.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]))});
}
export function saveReceipt(row: any, requestId: unknown, fingerprint: string): "same" | "changed" | null {
  const receipt = record(record(row?.research_summary).draft_save);
  return receipt.requestId === requestId && requestId ? receipt.fingerprint === fingerprint ? "same" : "changed" : null;
}
export const withSaveReceipt = (summary: unknown, requestId: string, fingerprint: string) => ({...record(summary), draft_save: {requestId, fingerprint}});
