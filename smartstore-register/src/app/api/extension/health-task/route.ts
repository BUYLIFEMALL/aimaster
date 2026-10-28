import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { userFromExtension } from "@/lib/extension/token";
import { extVersionNumber } from "@/lib/smartstore/fields";
import { HEALTH_CONDITIONAL, HEALTH_EXT_MIN, HEALTH_INTERVAL_DAYS, HEALTH_TARGETS } from "@/lib/smartstore/health";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * 확장이 화면 점검을 하나 받는다(등록 작업·속성 읽기가 없을 때만 부름).
 * 회원이 「지금 점검」으로 만든 요청이 있으면 그것을, 없고 body.auto면 마지막 점검이 7일 넘었을 때 새로 만든다.
 */
export async function POST(req: Request) {
  const who = await userFromExtension(req);
  if (!who.ok) return NextResponse.json({ error: who.error }, { status: who.status });
  if (extVersionNumber(req.headers.get("x-ext-version")) < extVersionNumber(HEALTH_EXT_MIN)) return NextResponse.json({ check: null });
  const body = (await req.json().catch(() => ({}))) as { auto?: unknown };
  const admin = createAdminClient();
  const now = new Date().toISOString();

  // 5분 넘게 「점검 중」이면 확장이 멈춘 것 — 실패로 정리
  await admin.from("smartstore_register_health")
    .update({ status: "failed", error: "확장이 응답하지 않았습니다. 다시 점검해 주세요.", updated_at: now })
    .eq("user_id", who.userId).eq("status", "running").lt("updated_at", new Date(Date.now() - 5 * 60_000).toISOString());

  let id: string | null = null;
  const { data: queued } = await admin.from("smartstore_register_health").select("id").eq("user_id", who.userId).eq("status", "queued").order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (queued) {
    const { data } = await admin.from("smartstore_register_health").update({ status: "running", updated_at: now }).eq("id", queued.id).eq("user_id", who.userId).eq("status", "queued").select("id").maybeSingle();
    id = data?.id ?? null;
  } else if (body.auto === true) {
    const { data: last } = await admin.from("smartstore_register_health").select("created_at").eq("user_id", who.userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const due = !last || Date.now() - new Date(last.created_at).getTime() > HEALTH_INTERVAL_DAYS * 86_400_000;
    if (due) {
      const { data } = await admin.from("smartstore_register_health").insert({ user_id: who.userId, status: "running", ext_version: req.headers.get("x-ext-version")?.slice(0, 20) ?? null }).select("id").single();
      id = data?.id ?? null;
    }
  }
  if (!id) return NextResponse.json({ check: null });
  return NextResponse.json({ check: { id, targets: HEALTH_TARGETS, conditional: HEALTH_CONDITIONAL } });
}
