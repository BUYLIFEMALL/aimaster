import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";

interface SignedRequestPayload {
  algorithm?: string;
  user_id?: string;
  issued_at?: number;
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function parseSignedRequest(signedRequest: string) {
  const [encodedSig, encodedPayload] = signedRequest.split(".", 2);
  if (!encodedSig || !encodedPayload) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload).toString("utf8")) as SignedRequestPayload;
    return { signature: base64UrlDecode(encodedSig), encodedPayload, payload };
  } catch {
    return null;
  }
}

function isValidSignature(signature: Buffer, encodedPayload: string, appSecret: string): boolean {
  const expected = createHmac("sha256", appSecret).update(encodedPayload).digest();
  return expected.length === signature.length && timingSafeEqual(expected, signature);
}

// One member Meta app is shared by all three Threads programs (auto-posting, comment-reply,
// affiliate), but Meta allows a single uninstall/delete callback URL, so this endpoint covers the
// connection tables of all three.
export const THREADS_ACCOUNT_TABLES = ["tap_accounts", "threads_accounts", "th_accounts"] as const;

// Members connect through their own Meta apps, so the signature must be checked against the app
// secret of each member linked to this Threads user; only those that verify are returned.
export async function resolveSignedRequestAccounts(signedRequest: string | null): Promise<{
  threadsUserId?: string;
  userIds: string[];
  malformed: boolean;
}> {
  const parsed = signedRequest ? parseSignedRequest(signedRequest) : null;
  if (!parsed || parsed.payload.algorithm?.toUpperCase() !== "HMAC-SHA256" || !parsed.payload.user_id) {
    return { userIds: [], malformed: true };
  }

  const threadsUserId = String(parsed.payload.user_id);
  const admin = createAdminClient();
  const candidateIds = new Set<string>();
  for (const table of THREADS_ACCOUNT_TABLES) {
    const { data } = await (admin as any).from(table).select("user_id").eq("threads_user_id", threadsUserId);
    ((data ?? []) as Array<{ user_id: string }>).forEach((row) => candidateIds.add(row.user_id));
  }

  const userIds: string[] = [];
  for (const userId of candidateIds) {
    const appSecret = await getUserApiKey(admin, userId, "meta_app_secret");
    if (appSecret && isValidSignature(parsed.signature, parsed.encodedPayload, appSecret)) {
      userIds.push(userId);
    }
  }
  return { threadsUserId, userIds, malformed: false };
}
