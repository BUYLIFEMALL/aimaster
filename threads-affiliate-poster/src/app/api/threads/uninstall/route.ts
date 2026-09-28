import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSignedRequestAccounts, THREADS_ACCOUNT_TABLES } from "@/lib/threads/signedRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Meta "Uninstall Callback URL": called when a Threads user removes the app. Auth is the
// signed_request signature (verified per member app secret), not a program-access session.
export async function POST(request: NextRequest) {
  const form = await request.formData();
  const { threadsUserId, userIds, malformed } = await resolveSignedRequestAccounts(
    form.get("signed_request")?.toString() ?? null,
  );
  if (malformed) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });

  if (userIds.length > 0) {
    const admin = createAdminClient();
    for (const table of THREADS_ACCOUNT_TABLES) {
      await (admin as any).from(table).delete().eq("threads_user_id", threadsUserId!).in("user_id", userIds);
    }
  }

  console.info("[threads uninstall]", { threadsUserId, disconnected: userIds.length });
  return NextResponse.json({ success: true });
}
