import { type NextRequest } from "next/server";
import { json } from "@/lib/aiRoute";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalize, mainPrompt } from "@/lib/rpa/schemas";
import { cleanTitle } from "@/lib/rpa/validate";
import type { MediaType } from "@/lib/rpa/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Ctx = { params: Promise<{ id: string }> };

async function guard(ctx: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return { res: json({ error: access.error }, access.status) };
  const { id } = await ctx.params;
  if (!UUID.test(id)) return { res: json({ error: "기록을 찾을 수 없습니다." }, 404) };
  return { user: access.user, id };
}

export async function GET(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const { data } = await createAdminClient()
    .from("reverse_prompt_history")
    .select("id, title, media_type, mime, file_name, options, result, model_used, favorite, created_at")
    .eq("id", g.id).eq("user_id", g.user.id).maybeSingle();
  if (!data) return json({ error: "기록을 찾을 수 없습니다." }, 404);
  return json({ item: data });
}

/** 제목·즐겨찾기·결과(프롬프트 편집) 수정 */
export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  let body: { title?: unknown; favorite?: unknown; result?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  const admin = createAdminClient();
  const { data: cur } = await admin.from("reverse_prompt_history").select("id, media_type, options").eq("id", g.id).eq("user_id", g.user.id).maybeSingle();
  if (!cur) return json({ error: "기록을 찾을 수 없습니다." }, 404);
  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) patch.title = cleanTitle(body.title);
  if (body.favorite !== undefined) patch.favorite = body.favorite === true;
  if (body.result !== undefined) {
    const media = cur.media_type as MediaType;
    const target = (cur.options as { target?: string } | null)?.target;
    const result = normalize(media, body.result, target);
    if (!result) return json({ error: "결과 형식이 올바르지 않습니다." }, 400);
    patch.result = result;
    patch.prompt = mainPrompt(media, result);
  }
  if (!Object.keys(patch).length) return json({ error: "바꿀 내용이 없습니다." }, 400);
  const { error } = await admin.from("reverse_prompt_history").update(patch).eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "저장하지 못했습니다." }, 500);
  return json({ ok: true, ...(patch.result ? { result: patch.result } : {}) });
}

export async function DELETE(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const { error } = await createAdminClient().from("reverse_prompt_history").delete().eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "삭제하지 못했습니다." }, 500);
  return json({ ok: true });
}
