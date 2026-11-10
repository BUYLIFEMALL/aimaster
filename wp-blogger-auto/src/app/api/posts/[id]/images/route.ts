import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForPost, generateSlot, removeSlot } from "@/lib/image/service";
import { draftErrorView } from "@/lib/draft/service";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;
const SLOT = /^(featured|s[1-9]\d?)$/;

/** action=plan(장면 설명 만들기, count 0~4) / action=generate(한 장 만들기, slot·imageModel) — 한 번에 한 장(서버 시간 제한 안) */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  const body = ((await req.json().catch(() => null)) ?? {}) as { action?: string; count?: number; slot?: string; imageModel?: string };
  const admin = createAdminClient();
  try {
    if (body.action === "plan") return json({ ok: true, images: await planForPost(admin, access.user.id, id, Number(body.count ?? 2)) });
    if (body.action === "generate" && typeof body.slot === "string" && SLOT.test(body.slot)) {
      return json({ ok: true, image: await generateSlot(admin, access.user.id, id, body.slot, body.imageModel) });
    }
    return json({ error: "잘못된 요청입니다." }, 400);
  } catch (e) {
    const v = draftErrorView(e);
    return json(v, v.status);
  }
}

/** 이미지 빼기 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  const body = ((await req.json().catch(() => null)) ?? {}) as { slot?: string };
  if (!UUID.test(id) || typeof body.slot !== "string" || !SLOT.test(body.slot)) return json({ error: "잘못된 요청입니다." }, 400);
  try {
    await removeSlot(createAdminClient(), access.user.id, id, body.slot);
    return json({ ok: true });
  } catch (e) {
    const v = draftErrorView(e);
    return json(v, v.status);
  }
}
