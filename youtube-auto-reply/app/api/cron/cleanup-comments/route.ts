import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 2026-10-17 v1.10 (#16): 회원 생성 데이터 30일 보관(루트 CLAUDE.md 최상위 규칙). 매일 1회 Vercel Cron, CRON_SECRET Bearer 인증.
// 행을 지우지 않고 내용만 비운다 — sync가 ytreply_comments.youtube_comment_id로 "이미 처리한 댓글"을 구분하므로,
// 행을 지우면 같은 댓글에 AI 초안을 다시 만들고(유료) 자동 게시 회원은 같은 답글을 다시 공개 게시할 수 있다.
// - 30일 지난 검토 대기 초안: 상태를 skipped(만료)로
// - 30일 지난 모든 기록: 댓글 본문·작성자·AI 답글 삭제(빈 값), 댓글 번호·상태·시각만 남김
const RETENTION_DAYS = 30;

function isAuthorized(request: NextRequest): boolean {
  // CRON_SECRET이 비어 있으면 「Bearer undefined」로 통과되던 빈틈을 막는다(v1.12).
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();

  const expired = await admin
    .from("ytreply_comments")
    .update({ status: "skipped" })
    .eq("status", "pending_review")
    .lt("fetched_at", cutoff)
    .select("id");
  if (expired.error) return NextResponse.json({ error: expired.error.message }, { status: 500 });

  const scrubbed = await admin
    .from("ytreply_comments")
    .update({ comment_text: "", author_display_name: null, generated_reply: null })
    .lt("fetched_at", cutoff)
    .neq("comment_text", "")
    .select("id");
  if (scrubbed.error) return NextResponse.json({ error: scrubbed.error.message }, { status: 500 });

  return NextResponse.json({ expired: expired.data?.length ?? 0, scrubbed: scrubbed.data?.length ?? 0, cutoff });
}
