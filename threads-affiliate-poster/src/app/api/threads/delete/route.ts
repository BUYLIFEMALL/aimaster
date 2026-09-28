import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSignedRequestAccounts } from "@/lib/threads/signedRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DELETION_STATUS_URL = "https://www.buylife.xyz/data-deletion";

// Meta "Delete Callback URL": deletes data obtained from Threads (connection/token and posts
// saved from Threads keyword search) and answers with the url + confirmation_code Meta requires.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const { threadsUserId, userIds, malformed } = await resolveSignedRequestAccounts(
    form.get("signed_request")?.toString() ?? null,
  );
  if (malformed) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });

  if (userIds.length > 0) {
    const admin = createAdminClient();
    await admin.from("tap_accounts").delete().eq("threads_user_id", threadsUserId!).in("user_id", userIds);
    await (admin as any).from("tap_saved_posts").delete().in("user_id", userIds).like("post_id", "th-%");
  }

  const confirmationCode = randomUUID().replace(/-/g, "").slice(0, 16);
  console.info("[threads data deletion]", { threadsUserId, deletedFor: userIds.length, confirmationCode });

  return NextResponse.json({
    url: `${DELETION_STATUS_URL}?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
