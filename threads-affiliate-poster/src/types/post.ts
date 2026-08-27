import type { Database, PostStatus } from "./database.types";

export type Post = Database["public"]["Tables"]["tap_posts"]["Row"];
export type ThreadsAccount = Database["public"]["Tables"]["tap_accounts"]["Row"];

export type { PostStatus };

export const POST_STATUS_LABELS: Record<PostStatus, string> = {
  draft: "임시저장",
  scheduled: "예약됨",
  publishing: "게시 중",
  published: "게시 완료",
  failed: "게시 실패",
};
