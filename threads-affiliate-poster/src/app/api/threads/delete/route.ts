import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSignedRequestAccounts, THREADS_ACCOUNT_TABLES } from "@/lib/threads/signedRequest";
import { DATA_DELETION_URL, IS_STANDALONE } from "@/lib/deployment";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Meta "Delete Callback URL": deletes data obtained from Threads for all three Threads programs
// (connections/tokens, comment-reply's fetched posts and comments, affiliate's keyword-search
// bookmarks) and answers with the url + confirmation_code Meta requires. Posts the member wrote
// through the programs are their own content and are kept.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const { threadsUserId, userIds, malformed } = await resolveSignedRequestAccounts(
    form.get("signed_request")?.toString() ?? null,
  );
  if (malformed) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });

  if (userIds.length > 0) {
    const admin = createAdminClient() as any;
    for (const table of THREADS_ACCOUNT_TABLES) {
      await admin.from(table).delete().eq("threads_user_id", threadsUserId!).in("user_id", userIds);
    }
    // th_comments rows cascade from th_posts (comment-reply program; absent in a standalone copy).
    if (!IS_STANDALONE) await admin.from("th_posts").delete().in("user_id", userIds);
    await admin.from("tap_saved_posts").delete().in("user_id", userIds).like("post_id", "th-%");
  }

  const confirmationCode = randomUUID().replace(/-/g, "").slice(0, 16);
  console.info("[threads data deletion]", { threadsUserId, deletedFor: userIds.length, confirmationCode });

  return NextResponse.json({
    url: `${DATA_DELETION_URL}?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
