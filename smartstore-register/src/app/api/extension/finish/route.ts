import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const FINAL = new Set(["filled", "temp_saved", "registered", "failed"]);
const s = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : null);

/** 확장이 결과를 보고한다 — 「입력 중」인 본인 작업만 바꾼다. */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const status = typeof body.status === "string" && FINAL.has(body.status) ? body.status : null;
  const jobId = typeof body.jobId === "string" ? body.jobId : "";
  if (!status || !/^[0-9a-f-]{36}$/.test(jobId)) return NextResponse.json({ error: "잘못된 보고입니다." }, { status: 400 });
  const { data, error } = await createAdminClient()
    .from("smartstore_register_jobs")
    .update({
      status,
      failed_step: s(body.failedStep, 200),
      error: s(body.error, 1000),
      market_product_no: s(body.marketProductNo, 40),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("user_id", who.userId)
    .eq("status", "running")
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "기록하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: Boolean(data) });
}
