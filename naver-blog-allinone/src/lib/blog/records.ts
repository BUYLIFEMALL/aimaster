import "server-only";
import { measureLength } from "./article";
import type { ImageSlot, PostSettings, ReviewStatus, SavedPost, SavedPostSummary, StepLog } from "./types";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** DB 행 → 화면용 저장 글 */
export function toSavedPost(row: Record<string, unknown>): SavedPost {
  return {
    id: row.id as string,
    title: row.title as string,
    summary: (row.summary as string) ?? "",
    article: row.article as string,
    tags: (row.tags as string[]) ?? [],
    settings: row.settings as PostSettings,
    images: (row.images as ImageSlot[]) ?? [],
    reviewStatus: ((row.review_status as ReviewStatus) ?? "UNKNOWN"),
    reviewNote: (row.review_note as string) ?? "",
    steps: (row.steps as StepLog[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function toSummary(row: Record<string, unknown>): SavedPostSummary {
  const images = ((row.images as ImageSlot[]) ?? []).filter((i) => i.url);
  return {
    id: row.id as string,
    title: row.title as string,
    summary: (row.summary as string) ?? "",
    thumbnailUrl: images.find((i) => i.type === "thumbnail")?.url ?? images[0]?.url ?? null,
    imageCount: images.length,
    charCount: measureLength((row.article as string) ?? ""),
    categoryId: ((row.settings as PostSettings | null)?.categoryId) ?? null,
    reviewStatus: ((row.review_status as ReviewStatus) ?? "UNKNOWN"),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
