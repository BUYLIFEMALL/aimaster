import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 확장 상태 보고. 숫자·상태만 받는다. 다른 칸(매물 내용 등)이 섞인 요청은 거절한다.
const ALLOWED = new Set(["extVersion", "result", "count", "error", "ranAt"]);
const RESULTS = new Set(["ok", "blocked", "rule_mismatch", "error"]);

export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연결 코드이거나 이용 권한이 없습니다." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "형식이 올바르지 않습니다." }, { status: 400 });
  if (Object.keys(body).some((k) => !ALLOWED.has(k))) return NextResponse.json({ error: "상태 숫자 외의 내용은 받지 않습니다." }, { status: 400 });
  const result = String(body.result ?? "");
  const count = Number(body.count);
  const ranAt = new Date(String(body.ranAt ?? ""));
  if (!RESULTS.has(result) || !Number.isInteger(count) || count < 0 || count > 100000 || Number.isNaN(ranAt.getTime())) {
    return NextResponse.json({ error: "형식이 올바르지 않습니다." }, { status: 400 });
  }
  const { error } = await createAdminClient().from("commercial_land_preferences").upsert(
    { user_id: user.userId, ext_version: String(body.extVersion ?? "").slice(0, 16) || null, ext_last_run_at: ranAt.toISOString(), ext_last_result: result, ext_last_count: count, ext_last_error: body.error ? String(body.error).slice(0, 200) : null },
    { onConflict: "user_id" },
  );
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
