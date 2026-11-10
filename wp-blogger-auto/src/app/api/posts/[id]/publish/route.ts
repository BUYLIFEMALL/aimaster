import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { publishPost, cancelScheduled, parsePublishRequest, publishErrorView } from "@/lib/publishFlow";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

/** 발행(회원이 고른 방식) — 자동 재시도 없음 */
export async function POST(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  try {
    const r = await publishPost(createAdminClient(), access.user.id, id, parsePublishRequest(await req.json().catch(() => null)));
    return json({ ok: true, ...r });
  } catch (e) {
    const v = publishErrorView(e);
    return json(v, v.status);
  }
}

/** 예약 취소 → 블로그에서 초안으로 */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!UUID.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  try {
    return json({ ok: true, ...(await cancelScheduled(createAdminClient(), access.user.id, id)) });
  } catch (e) {
    const v = publishErrorView(e);
    return json(v, v.status);
  }
}
