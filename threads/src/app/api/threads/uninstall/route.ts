import { NextRequest, NextResponse } from "next/server";
import { IS_STANDALONE } from "@/lib/deployment";
import { deleteThreadsConnections, resolveSignedRequestAccounts } from "@/lib/threads/signedRequest";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Meta 「제거 콜백 URL」(독립 운영 모드 전용): Threads 사용자가 앱을 제거하면 그 연결을 지운다.
// 인증은 로그인 세션이 아니라 회원 앱 시크릿으로 확인한 signed_request 서명이다.
// 운영(AIMaster)에서는 쓰레드 쇼핑제휴의 같은 경로가 이 프로그램 연결까지 처리하므로 여기서는 404.
export async function POST(request: NextRequest) {
  if (!IS_STANDALONE) return NextResponse.json({ error: "not found" }, { status: 404 });
  // 본문이 없거나 폼 형식이 아니면 잘못된 요청(400)으로 답한다(예전엔 500).
  const form = await request.formData().catch(() => null);
  const { threadsUserId, userIds, malformed } = await resolveSignedRequestAccounts(form?.get("signed_request")?.toString() ?? null);
  if (malformed) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  await deleteThreadsConnections(threadsUserId!, userIds);
  console.info("[threads uninstall]", { threadsUserId, disconnected: userIds.length });
  return NextResponse.json({ success: true });
}
