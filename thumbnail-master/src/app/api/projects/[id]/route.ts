import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { removeImages, signUrls } from "@/lib/images";
import { allPaths, loadOwned } from "@/lib/projects";
import { cleanInputs, cleanName, cleanStrategy, isOpt, isUuid, stageOf } from "@/lib/tmb/validate";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
type Ctx = { params: Promise<{ id: string }> };

async function guard(ctx: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return { res: json({ error: access.error }, access.status) };
  const { id } = await ctx.params;
  if (!isUuid(id)) return { res: json({ error: "프로젝트를 찾을 수 없습니다." }, 404) };
  return { user: access.user, id };
}

export async function GET(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const p = await loadOwned(g.user.id, g.id);
  if (!p) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  return json({ project: p, urls: await signUrls(allPaths(p)) });
}

/** 이름·입력·전략 저장(자동 저장). 이미지 컬럼은 생성/수정 API만 바꾼다. */
export async function PUT(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  let body: { name?: unknown; inputs?: unknown; strategy?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const cur = await loadOwned(g.user.id, g.id);
  if (!cur) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const strategy = body.strategy === undefined ? cur.strategy : cleanStrategy(body.strategy);
  const hasImage = cur.images_a.versions.length > 0 || cur.images_b.versions.length > 0;
  const patch = {
    name: body.name === undefined ? cur.name : cleanName(body.name),
    inputs: body.inputs === undefined ? cur.inputs : cleanInputs(body.inputs),
    strategy,
    stage: stageOf(strategy, hasImage),
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await createAdminClient().from("thumbnail_master_projects").update(patch).eq("id", g.id).eq("user_id", g.user.id).select("id, name, updated_at").single();
  if (error || !data) return json({ error: "저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  return json({ project: data });
}

/** 이미지 버전 되돌리기: { option, cur } */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  let body: { option?: unknown; cur?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const cur = await loadOwned(g.user.id, g.id);
  if (!cur) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  if (!isOpt(body.option) || typeof body.cur !== "number") return json({ error: "요청 형식이 올바르지 않습니다." }, 400);
  const set = body.option === "a" ? cur.images_a : cur.images_b;
  if (!Number.isInteger(body.cur) || body.cur < 0 || body.cur >= set.versions.length) return json({ error: "해당 버전이 없습니다." }, 400);
  const col = body.option === "a" ? "images_a" : "images_b";
  const { error } = await createAdminClient().from("thumbnail_master_projects").update({ [col]: { ...set, cur: body.cur } }).eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "저장하지 못했습니다." }, 500);
  return json({ option: body.option, set: { ...set, cur: body.cur } });
}

export async function DELETE(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const p = await loadOwned(g.user.id, g.id);
  if (!p) return json({ ok: true });
  const { error } = await createAdminClient().from("thumbnail_master_projects").delete().eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "삭제하지 못했습니다." }, 500);
  await removeImages(allPaths(p));
  return json({ ok: true });
}
