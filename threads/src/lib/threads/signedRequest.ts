import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserApiKey } from "@/lib/apiKeys";

// 독립 운영 모드(수강생 배포 키트) 전용 — Meta 「제거 콜백·삭제 콜백」의 signed_request 확인.
// 기준: threads-affiliate-poster/src/lib/threads/signedRequest.ts. 운영(AIMaster)에서는 쓰레드 쇼핑제휴가
// 세 Threads 프로그램의 연결을 함께 처리하므로 이 파일을 쓰지 않는다. 배포판은 이 프로그램 표(threads_accounts) 하나뿐이다.

interface SignedRequestPayload {
  algorithm?: string;
  user_id?: string;
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

/** 회원마다 본인 Meta 앱을 쓰므로, 그 Threads 계정을 연결한 회원의 앱 시크릿으로 서명을 확인해 맞는 회원만 돌려준다. */
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
  const { data } = await admin.from("threads_accounts").select("user_id").eq("threads_user_id", threadsUserId);
  const userIds: string[] = [];
  for (const { user_id } of (data ?? []) as Array<{ user_id: string }>) {
    const appSecret = await getUserApiKey(admin, user_id, "threads_app_secret");
    if (appSecret && isValidSignature(parsed.signature, parsed.encodedPayload, appSecret)) userIds.push(user_id);
  }
  return { threadsUserId, userIds, malformed: false };
}

/** 확인된 회원의 Threads 연결(토큰)을 지운다. 회원이 쓴 글은 회원 본인 콘텐츠라 남긴다. */
export async function deleteThreadsConnections(threadsUserId: string, userIds: string[]) {
  if (userIds.length === 0) return;
  await createAdminClient().from("threads_accounts").delete().eq("threads_user_id", threadsUserId).in("user_id", userIds);
}
