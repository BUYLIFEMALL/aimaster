import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushVersion, removeImages, saveImage, signUrls, toJpeg } from "@/lib/images";
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

/** 바나나 「🧽 무료 지우기」(회원 브라우저 처리)에서 돌아온 결과를 새 버전으로 추가: form { option, file } — AI 호출 없음, 원본 유지 */
const RETURN_MAX_BYTES = 4 * 1024 * 1024; // 요청 본문 4.5MB 한도 아래(화면이 JPG로 줄여 보냄)
export async function POST(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const option = form.get("option"), file = form.get("file");
  if (!isOpt(option) || !(file instanceof Blob) || !["image/jpeg", "image/png"].includes(file.type)) return json({ error: "JPG·PNG 결과만 넣을 수 있습니다." }, 400);
  if (file.size === 0 || file.size > RETURN_MAX_BYTES) return json({ error: "결과가 4MB를 넘어 넣을 수 없습니다. 결과를 내려받아 줄여 주세요." }, 413);
  const cur = await loadOwned(g.user.id, g.id);
  if (!cur) return json({ error: "프로젝트를 찾을 수 없습니다." }, 404);
  const set = option === "a" ? cur.images_a : cur.images_b;
  const base = set.versions[set.cur];
  if (!base) return json({ error: "먼저 썸네일을 생성해 주세요." }, 400);

  let jpeg: Buffer;
  try { jpeg = await toJpeg(Buffer.from(await file.arrayBuffer())); } catch { return json({ error: "이미지를 읽지 못했습니다. 다시 시도해 주세요." }, 400); }
  let path: string;
  try { path = await saveImage(g.user.id, g.id, option, jpeg); } catch { return json({ error: "이미지를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }

  const { set: next, removed } = pushVersion(set, { path, at: new Date().toISOString(), model: "무료 지우기(내 PC)", instruction: "🧽 무료 지우기", ...(base.main !== undefined ? { main: base.main, sub: base.sub } : {}) });
  const col = option === "a" ? "images_a" : "images_b";
  const { error } = await createAdminClient().from("thumbnail_master_projects").update({ [col]: next, updated_at: new Date().toISOString() }).eq("id", g.id).eq("user_id", g.user.id);
  if (error) { await removeImages([path]); return json({ error: "결과를 저장하지 못했습니다. 다시 시도해 주세요." }, 500); }
  await removeImages(removed);
  return json({ option, set: next, urls: await signUrls(next.versions.map((v) => v.path)) });
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
