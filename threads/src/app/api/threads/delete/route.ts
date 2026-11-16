import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { IS_STANDALONE, SITE_URL } from "@/lib/deployment";
import { deleteThreadsConnections, resolveSignedRequestAccounts } from "@/lib/threads/signedRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Meta 「삭제 콜백 URL」(독립 운영 모드 전용): Threads에서 받은 연결 정보(토큰)를 지우고
// Meta가 요구하는 url + confirmation_code로 답한다. 회원이 프로그램으로 쓴 글은 본인 콘텐츠라 남긴다.
// 운영(AIMaster)에서는 쓰레드 쇼핑제휴의 같은 경로가 처리하므로 여기서는 404.
export async function POST(request: NextRequest) {
  if (!IS_STANDALONE) return NextResponse.json({ error: "not found" }, { status: 404 });
  // 본문이 없거나 폼 형식이 아니면 잘못된 요청(400)으로 답한다(예전엔 500).
  const form = await request.formData().catch(() => null);
  const { threadsUserId, userIds, malformed } = await resolveSignedRequestAccounts(form?.get("signed_request")?.toString() ?? null);
  if (malformed) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  await deleteThreadsConnections(threadsUserId!, userIds);

  const confirmationCode = randomUUID().replace(/-/g, "").slice(0, 16);
  console.info("[threads data deletion]", { threadsUserId, deletedFor: userIds.length, confirmationCode });
  return NextResponse.json({
    url: `${SITE_URL}/data-deletion?code=${confirmationCode}`,
    confirmation_code: confirmationCode,
  });
}
