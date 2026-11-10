import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { createDraft, draftErrorView } from "@/lib/draft/service";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";
export const maxDuration = 300;

/** 원고 만들기 — 회원 본인 Claude 키로 1회 호출(자동 재시도 없음) */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = await req.json().catch(() => null);
  try {
    const r = await createDraft(createAdminClient(), access.user.id, body);
    const skipped = r.references.filter((x) => "error" in x).map((x) => ({ url: x.url, error: (x as { error: string }).error }));
    return json({ ok: true, id: r.id, chars: r.draft.chars, skippedReferences: skipped });
  } catch (e) {
    const v = draftErrorView(e);
    return json(v, v.status);
  }
}
