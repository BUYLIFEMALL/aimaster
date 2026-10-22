import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, THIS_PROGRAM_SLUG } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { logProgramUsage } from "@/lib/programAccess";
import { pickAllowed } from "@/lib/linkMark";
import { HANDOFF_TARGETS, isHandoffItemId } from "@/lib/linkHandoff";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST { to, itemId } — v1.39: 서버 보관함 결과를 다른 프로그램(형식 바꾸기·스토리보드)으로 처음 넘겼다는 기록.
 * 회원 본인 usage_logs에 1줄(action `linked_handoff`, metadata.to·itemId)만 남긴다 — DB 칸 추가 없음(관리자 연계 통계 「넘김」용).
 * to는 정해진 곳만, itemId는 보관함 번호(UUID) 형식만 받는다.
 */
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await req.json().catch(() => null);
  const to = pickAllowed(body?.to, HANDOFF_TARGETS);
  const itemId = body?.itemId;
  if (!to || !isHandoffItemId(itemId)) return NextResponse.json({ error: "넘긴 곳이나 보관함 번호가 올바르지 않습니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data: program } = await admin.from("programs").select("id").eq("slug", THIS_PROGRAM_SLUG).maybeSingle();
  if (!program) return NextResponse.json({ error: "프로그램 정보를 찾지 못했습니다." }, { status: 500 });
  await logProgramUsage(admin, { userId: access.user.id, programId: program.id as string, action: "linked_handoff", metadata: { to, itemId } });
  return NextResponse.json({ ok: true });
}
