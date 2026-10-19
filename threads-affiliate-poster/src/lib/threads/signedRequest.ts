import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";
import { IS_STANDALONE } from "@/lib/deployment";

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
// connection tables of all three. A standalone copy only has its own table.
export const THREADS_ACCOUNT_TABLES: readonly string[] = IS_STANDALONE
  ? ["tap_accounts"]
  : ["tap_accounts", "threads_accounts", "th_accounts"];

/**
 * v1.66: 공용 표(member_platform_accounts)의 그 Threads 계정을 지우고, 운영 자동화(tco_threads_accounts)는 토큰만 무효로 만든다.
 * 운영 자동화 계정 행은 글·운영 설정·글감이 on delete cascade로 묶여 있어 지우면 회원이 쓴 글까지 사라진다 —
 * 그래서 행은 남기고 토큰을 비우고 만료 시각을 지금으로 바꾼다(프로그램은 「토큰 만료 — 다시 연결」로 안내). 배포판은 해당 없음.
 */
export async function clearOtherThreadsConnections(threadsUserId: string, userIds: string[]) {
  if (IS_STANDALONE || userIds.length === 0) return;
  const admin = createAdminClient() as any;
  await admin.from("member_platform_accounts").delete().eq("platform", "threads").eq("external_id", threadsUserId).in("user_id", userIds);
  await admin.from("tco_threads_accounts").update({ access_token: "", token_expires_at: new Date().toISOString() })
    .eq("threads_user_id", threadsUserId).in("user_id", userIds);
}

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
  // 공용 표·운영 자동화에만 연결이 있는 회원도 후보에 넣는다(서명은 아래에서 회원 앱 시크릿으로 똑같이 확인) — v1.66
  if (!IS_STANDALONE) {
    const extra = [
      (admin as any).from("member_platform_accounts").select("user_id").eq("platform", "threads").eq("external_id", threadsUserId),
      (admin as any).from("tco_threads_accounts").select("user_id").eq("threads_user_id", threadsUserId),
    ];
    for (const { data } of await Promise.all(extra)) {
      ((data ?? []) as Array<{ user_id: string }>).forEach((row) => candidateIds.add(row.user_id));
    }
  }

  const userIds: string[] = [];
  for (const userId of candidateIds) {
    const appSecret = await getUserApiKey(admin, userId, "threads_app_secret");
    if (appSecret && isValidSignature(parsed.signature, parsed.encodedPayload, appSecret)) {
      userIds.push(userId);
    }
  }
  return { threadsUserId, userIds, malformed: false };
}
