import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";
import { normalizeLookupResult } from "@/lib/smartstore/attributes";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 확장이 상품속성 읽기 결과를 보고한다 — 「읽는 중」인 본인 요청만 바꾼다. 결과 모양은 서버에서 다시 정리한다. */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; ok?: unknown; result?: unknown; error?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "잘못된 보고입니다." }, { status: 400 });
  const result = body.ok === true ? normalizeLookupResult(body.result) : null;
  const patch = result
    ? { status: "done", result, category_id: result.category.id, error: null }
    : { status: "failed", error: (typeof body.error === "string" ? body.error : "속성을 읽지 못했습니다.").slice(0, 500) };
  const { data, error } = await createAdminClient()
    .from("smartstore_register_attr_lookups")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", who.userId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: Boolean(data) });
}
