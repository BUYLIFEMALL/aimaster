import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseDraftEdit, draftErrorView, EDITABLE } from "@/lib/draft/service";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

/** 원고 고치기 — 본인 원고, 고칠 수 있는 상태일 때만 */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  try {
    const patch = parseDraftEdit(await req.json().catch(() => null));
    const { data, error } = await createAdminClient().from("wba_posts")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id).eq("user_id", access.user.id).in("status", EDITABLE)
      .select("id, status, updated_at");
    if (error) return json({ error: "저장하지 못했습니다." }, 500);
    if (!data?.length) return json({ error: "지금은 고칠 수 없는 원고입니다(발행 중·예약·발행된 글은 블로그에서 고쳐 주세요)." }, 409);
    return json({ ok: true, updatedAt: data[0].updated_at });
  } catch (e) {
    const v = draftErrorView(e);
    return json(v, v.status);
  }
}

/** 원고 지우기 — 발행 중인 글은 지우지 않는다(이 프로그램 기록만 지움, 블로그 글은 그대로) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  const { data, error } = await createAdminClient().from("wba_posts")
    .delete().eq("id", id).eq("user_id", access.user.id).neq("status", "publishing").select("id");
  if (error) return json({ error: "지우지 못했습니다." }, 500);
  return data?.length ? json({ ok: true }) : json({ error: "지울 수 없는 원고입니다." }, 409);
}
