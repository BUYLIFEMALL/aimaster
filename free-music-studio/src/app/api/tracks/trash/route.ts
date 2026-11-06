import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKS_TABLE } from "@/lib/tracks";
import { parseIdList } from "@/lib/trash";
import { isOwnProject } from "@/lib/ownProject";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 휴지통에 넣기 { ids } / 되살리기 { ids, restore: true, project_id? } — 본인 곡만(원본 boks-music trash.mjs, MIT).
// 되살릴 때 project_id를 주면 프로젝트가 비어 있는(원래 프로젝트가 지워진) 곡만 그 프로젝트로 넣는다.
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const ids = parseIdList(body?.ids);
  if (!ids.ok) return NextResponse.json({ error: ids.error }, { status: 400 });
  const admin = createAdminClient();
  const uid = access.user.id;

  if (body?.restore === true) {
    const projectId = typeof body.project_id === "string" ? body.project_id : null;
    if (projectId && !(await isOwnProject(admin, uid, projectId))) return NextResponse.json({ error: "프로젝트를 찾지 못했습니다." }, { status: 404 });
    const { data, error } = await admin
      .from(TRACKS_TABLE)
      .update({ trashed_at: null, trash_batch_id: null })
      .eq("user_id", uid)
      .in("id", ids.value)
      .not("trashed_at", "is", null)
      .select("id, project_id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const orphans = (data ?? []).filter((t) => !t.project_id).map((t) => t.id);
    if (projectId && orphans.length) await admin.from(TRACKS_TABLE).update({ project_id: projectId }).eq("user_id", uid).in("id", orphans);
    return NextResponse.json({ restored: data?.length ?? 0 });
  }

  const { data, error } = await admin
    .from(TRACKS_TABLE)
    .update({ trashed_at: new Date().toISOString(), trash_batch_id: randomUUID() })
    .eq("user_id", uid)
    .in("id", ids.value)
    .is("trashed_at", null)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ trashed: data?.length ?? 0 });
}
