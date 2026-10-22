import { type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { json } from "@/lib/aiRoute";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUuid } from "@/lib/bnc/paths";
import type { OutputItem } from "@/lib/bnc/types";
import { remove, signUrls } from "@/lib/files";
import { onceMarkNext, pickAllowed } from "@/lib/bnc/linkMark";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
type Ctx = { params: Promise<{ id: string }> };

async function guard(ctx: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return { res: json({ error: access.error }, access.status) };
  const { id } = await ctx.params;
  if (!isUuid(id)) return { res: json({ error: "기록을 찾을 수 없습니다." }, 404) };
  return { user: access.user, id };
}

export async function GET(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const { data } = await createAdminClient()
    .from("banana_canvas_results")
    .select("id, kind, title, prompt, options, outputs, model_used, favorite, created_at")
    .eq("id", g.id).eq("user_id", g.user.id).maybeSingle();
  if (!data) return json({ error: "기록을 찾을 수 없습니다." }, 404);
  const outputs = (data.outputs as OutputItem[]) ?? [];
  const urls = await signUrls(outputs.map((o) => o.path));
  return json({ item: { ...data, outputs: outputs.map((o) => ({ ...o, url: o.path ? urls[o.path] ?? null : null })) } });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  let body: { favorite?: unknown; downloaded?: unknown; handoff?: unknown } = {};
  try { body = await request.json(); } catch { return json({ error: "요청 형식이 올바르지 않습니다." }, 400); }
  // v1.27: 처음 다운로드한 시각을 `options.downloadedAt`에 한 번만 남긴다(본인 결과만, 이미 있으면 그대로)
  // v1.28: 다음 단계로 넘긴 곳(형식 바꾸기·스토리보드)도 `options.handoffs.<곳>`에 처음 한 번만
  const handoff = pickAllowed(body.handoff, ["convert", "storyboard"] as const);
  if (body.downloaded === true || handoff) {
    const admin = createAdminClient();
    const { data } = await admin.from("banana_canvas_results").select("options").eq("id", g.id).eq("user_id", g.user.id).maybeSingle();
    if (!data) return json({ error: "결과를 찾을 수 없습니다." }, 404);
    // 첫 1회만 저장(공용 기준 코드 `link-mark`)
    const next = onceMarkNext(data.options, body.downloaded === true ? { kind: "download" } : { kind: "handoff", to: handoff! }, new Date().toISOString());
    if (next) {
      const { error } = await admin.from("banana_canvas_results").update({ options: next }).eq("id", g.id).eq("user_id", g.user.id);
      if (error) return json({ error: "저장하지 못했습니다." }, 500);
    }
    return json({ ok: true });
  }
  if (typeof body.favorite !== "boolean") return json({ error: "바꿀 내용이 없습니다." }, 400);
  const { error } = await createAdminClient().from("banana_canvas_results").update({ favorite: body.favorite }).eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "저장하지 못했습니다." }, 500);
  return json({ ok: true });
}

export async function DELETE(_r: NextRequest, ctx: Ctx) {
  const g = await guard(ctx);
  if (g.res) return g.res;
  const admin = createAdminClient();
  const { data } = await admin.from("banana_canvas_results").select("outputs").eq("id", g.id).eq("user_id", g.user.id).maybeSingle();
  if (!data) return json({ ok: true });
  const { error } = await admin.from("banana_canvas_results").delete().eq("id", g.id).eq("user_id", g.user.id);
  if (error) return json({ error: "삭제하지 못했습니다." }, 500);
  await remove(((data.outputs as OutputItem[]) ?? []).map((o) => o.path));
  return json({ ok: true });
}
