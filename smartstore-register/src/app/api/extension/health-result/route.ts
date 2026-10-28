import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";
import { HEALTH_TARGETS, normalizeHealthResult } from "@/lib/smartstore/health";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 확장이 화면 점검 결과를 보고한다 — 「점검 중」인 본인 행만 바꾼다. */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; ok?: unknown; error?: unknown };
  const id = typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "잘못된 보고입니다." }, { status: 400 });
  const r = normalizeHealthResult(body);
  const patch = body.ok === true
    ? { status: r.missing.length ? "changed" : "ok", missing: r.missing, conditional: r.conditional, store_name: r.storeName, checked_total: HEALTH_TARGETS.length, error: null }
    : { status: "failed", store_name: r.storeName, error: (typeof body.error === "string" ? body.error : "점검하지 못했습니다.").slice(0, 500) };
  const { data, error } = await createAdminClient()
    .from("smartstore_register_health")
    .update({ ...patch, ext_version: req.headers.get("x-ext-version")?.slice(0, 20) ?? null, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", who.userId).eq("status", "running")
    .select("id").maybeSingle();
  if (error) return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: Boolean(data) });
}
