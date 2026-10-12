import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAccess } from "@/lib/routeGuard";
import { getOwnedProject, removeFiles, thumbPath, toClient, updateOwnedProject } from "@/lib/projects";
import { DEFAULT_THUMB_SETTINGS, THUMB_FONTS, THUMB_STYLES } from "@/lib/playlist/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

/** GET — 프로젝트 하나(제목 후보·콘텐츠·썸네일 서명 URL) */
export async function GET(_req: Request, ctx: Ctx) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ project: await toClient(p) });
}

/** PATCH — 제목 선택, 썸네일 글자 설정 저장 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  const patch: Record<string, unknown> = {};
  if (typeof body?.title === "string") {
    const title = body.title.trim().slice(0, 200);
    if (!title) return NextResponse.json({ error: "제목을 선택하거나 입력해 주세요." }, { status: 400 });
    patch.title = title;
    // 제목이 바뀌면 그 제목에 맞춘 콘텐츠·썸네일은 새로 만들어야 하므로 비운다
    if (title !== p.title) {
      patch.content = {};
      patch.status = "titled";
      if (p.thumb_path) await removeFiles([thumbPath(a.user.id, id)]);
      patch.thumb_path = null;
      patch.thumb_prompt = null;
    }
  }
  if (body?.thumbSettings && typeof body.thumbSettings === "object") {
    const s = body.thumbSettings as Record<string, unknown>;
    const D = DEFAULT_THUMB_SETTINGS;
    patch.thumb_settings = {
      style: THUMB_STYLES.some((x) => x.id === s.style) ? s.style : D.style,
      font: THUMB_FONTS.some((x) => x.id === s.font) ? s.font : D.font,
      size: Math.min(0.15, Math.max(0.05, Number(s.size) || D.size)),
      color: typeof s.color === "string" && /^#[0-9a-f]{6}$/i.test(s.color) ? s.color : D.color,
      bold: !!s.bold,
      text: typeof s.text === "string" ? s.text.slice(0, 120) : "",
      position: s.position === "top" || s.position === "center" ? s.position : "bottom",
    };
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });
  if (!(await updateOwnedProject(a.user.id, id, patch))) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  const next = await getOwnedProject(a.user.id, id);
  return NextResponse.json({ project: next ? await toClient(next) : null });
}

/** DELETE — 프로젝트와 저장된 이미지를 함께 삭제 */
export async function DELETE(_req: Request, ctx: Ctx) {
  const a = await requireAccess();
  if (a.error) return a.error;
  const { id } = await ctx.params;
  const p = await getOwnedProject(a.user.id, id);
  if (!p) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  await removeFiles([thumbPath(a.user.id, id)]);
  const { error } = await createAdminClient().from("playlist_projects").delete().eq("id", id).eq("user_id", a.user.id);
  if (error) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
