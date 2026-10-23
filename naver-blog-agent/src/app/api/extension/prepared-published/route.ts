import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateProgramAccessForUser } from "@/lib/access";
import { recordPreparedPublish } from "@/lib/preparedPublish";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v2.15: 확장이 준비 탭에서 회원의 직접 발행(글 주소·제목 일치)을 확인해 보고한다. 확장은 버튼을 누르지 않는다.
const reply = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  try {
    const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "")?.trim();
    if (!token) return reply({ error: "인증 토큰이 누락되었습니다." }, 401);
    const admin = createAdminClient() as any;
    const { data: tokenRecord, error: tokenError } = await admin
      .from("nba_extension_tokens").select("user_id").eq("token", token).maybeSingle();
    if (tokenError) return reply({ error: "연결을 확인하지 못했습니다. 다시 보고합니다." }, 503);
    if (!tokenRecord) return reply({ error: "인증 실패" }, 401);
    const access = await evaluateProgramAccessForUser(tokenRecord.user_id);
    if (!access.allowed) return reply({ error: access.error }, access.status);
    const body = await req.json().catch(() => null);
    if (!body || typeof body.taskId !== "string" || typeof body.postUrl !== "string") return reply({ error: "taskId와 글 주소가 필요합니다." }, 400);
    const result = await recordPreparedPublish(admin, tokenRecord.user_id, body.taskId, body.postUrl, "extension");
    return reply(result.body, result.status);
  } catch {
    return reply({ error: "발행 결과 저장을 확인하지 못했습니다. 다시 보고합니다." }, 503);
  }
}
