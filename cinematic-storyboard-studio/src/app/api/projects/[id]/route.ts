import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/routeGuard";
import { getOwnedProject, removeProjectFolder, signedUrl } from "@/lib/projects";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

/** GET — 프로젝트 하나(분석·영상 프롬프트·이미지 서명 URL) */
export async function GET(_req: Request, ctx: Ctx) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({
    project: {
      id: p.id,
      title: p.title,
      topic: p.topic,
      lang: p.lang,
      engine: p.engine,
      status: p.status,
      analysis: p.analysis,
      videoPrompts: p.video_prompts,
      videoSettings: p.video_settings,
      createdAt: p.created_at,
      refUrl: await signedUrl(p.ref_path),
      masterUrl: await signedUrl(p.master_path),
    },
  });
}

/** DELETE — 프로젝트와 저장된 이미지를 함께 삭제 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  // 폴더째 비운다(v1.10 — 렌더마다 이름이 다른 마스터 파일까지)
  await removeProjectFolder(a.user.id, id);
  const { error } = await createAdminClient().from("storyboard_projects").delete().eq("id", id).eq("user_id", a.user.id);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
