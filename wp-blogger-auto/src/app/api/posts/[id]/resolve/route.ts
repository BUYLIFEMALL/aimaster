import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUncertain } from "@/lib/resolveUncertain";
import { draftErrorView } from "@/lib/draft/service";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

/** 「확인 필요」 정리 — 회원이 블로그에서 확인한 결과(sent / not_sent) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "원고를 찾지 못했습니다." }, 404);
  try {
    return json({ ok: true, status: await resolveUncertain(createAdminClient(), access.user.id, id, await req.json().catch(() => null)) });
  } catch (e) {
    const v = draftErrorView(e);
    return json(v, v.status);
  }
}
