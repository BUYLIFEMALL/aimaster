import type { Database } from "./database.types";

export type CafePost = Database["public"]["Tables"]["ncafe_posts"]["Row"];
export type CafeTarget = Database["public"]["Tables"]["ncafe_targets"]["Row"];
export type NaverAccount = Database["public"]["Tables"]["ncafe_accounts"]["Row"];
export type CafeCandidate = Database["public"]["Tables"]["ncafe_candidates"]["Row"];

export type CandidateSourceType = "http" | "rss" | "perplexity";

export const CANDIDATE_SOURCE_LABELS: Record<CandidateSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

export type PostStatus = "draft" | "publishing" | "published" | "failed";

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "임시저장",
  publishing: "게시 중",
  published: "게시 완료",
  failed: "게시 실패",
};
