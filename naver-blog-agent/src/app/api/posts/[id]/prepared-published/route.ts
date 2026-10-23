import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordPreparedPublish } from "@/lib/preparedPublish";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
type Context = { params: Promise<{ id: string }> };

// v2.15: 확장이 감지하지 못한 직접 발행(다른 PC·휴대폰·브라우저 재시작)을 회원이 글 주소로 기록한다.
export async function POST(req: Request, context: Context) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await context.params;
  const body = await req.json().catch(() => null);
  const result = await recordPreparedPublish(createAdminClient() as any, access.userId, id, body?.postUrl, "member");
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
