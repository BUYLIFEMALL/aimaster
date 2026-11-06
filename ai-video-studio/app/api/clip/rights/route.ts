import { NextResponse } from "next/server";
import { checkProgramAccessApi, PROGRAM_SLUG } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const TOOLS = new Set(["narration-cut", "rewrite"]);

/**
 * V2 본인 사용판 실행 기록(2026-11-06): 해설 교차편집처럼 영상이 서버에 오지 않는 도구는 실행 전에 이 길로 파일 이름·시각만 남긴다.
 * own_content_rights_log(회원별, 30일 뒤 /api/cron/cleanup이 지움). 기록에 실패하면 화면이 시작하지 않는다.
 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  const tool = typeof body.tool === "string" && TOOLS.has(body.tool) ? body.tool : null;
  if (!tool) return NextResponse.json({ error: "기록할 도구가 올바르지 않습니다." }, { status: 400 });
  if (body.rights !== true) return NextResponse.json({ error: "내가 만들었거나 권리를 가진 영상인지 먼저 확인해 주세요." }, { status: 400 });
  const fileName = (typeof body.fileName === "string" && body.fileName.trim() ? body.fileName.trim() : "video").slice(0, 200);
  const { error } = await createAdminClient().from("own_content_rights_log").insert({ user_id: user.id, program: PROGRAM_SLUG, tool, file_name: fileName });
  if (error) return NextResponse.json({ error: "실행 기록을 남기지 못해 시작하지 않았습니다. 잠시 뒤 다시 눌러 주세요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
