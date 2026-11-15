import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOKENS, emailOf, hashToken, newPairCode, newToken } from "@/lib/extension/token";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 웹 화면(로그인 회원)에서 연결 번호 발급 — 10분 유효, 한 번만 쓸 수 있음 */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const admin = createAdminClient();
  const now = new Date();
  // 이 회원의 쓰이지 않고 기한 지난 번호 정리(연결된 기기 행은 그대로)
  await admin.from(TOKENS).delete().eq("user_id", access.user.id).is("token_hash", null).lt("pair_code_expires_at", now.toISOString());
  const pairCode = newPairCode();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const { error } = await admin.from(TOKENS).insert({ user_id: access.user.id, pair_code: pairCode, pair_code_expires_at: expiresAt });
  if (error) return NextResponse.json({ error: "연결 번호를 만들지 못했습니다." }, { status: 500 });
  return NextResponse.json({ pairCode, expiresAt });
}

/** 크롬 확장이 연결 번호를 내고 토큰을 받는다(토큰 원문은 이 응답에서 한 번만) */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { code?: unknown; deviceName?: unknown };
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!/^[0-9A-F]{8}$/.test(code)) return NextResponse.json({ error: "연결 번호 8자리를 확인해 주세요." }, { status: 400 });
  const admin = createAdminClient();
  const { data } = await admin.from(TOKENS).select("id,user_id,pair_code_expires_at").eq("pair_code", code).is("token_hash", null).maybeSingle();
  if (!data || !data.pair_code_expires_at || new Date(data.pair_code_expires_at) < new Date()) {
    return NextResponse.json({ error: "연결 번호가 없거나 10분이 지났습니다. 프로그램에서 새 번호를 받아 주세요." }, { status: 400 });
  }
  const token = newToken();
  const device = typeof body.deviceName === "string" ? body.deviceName.slice(0, 40) : "Chrome";
  const { error } = await admin
    .from(TOKENS)
    .update({ token_hash: hashToken(token), pair_code: null, pair_code_expires_at: null, device_name: device, last_seen_at: new Date().toISOString() })
    .eq("id", data.id)
    .is("token_hash", null);
  if (error) return NextResponse.json({ error: "연결하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ token, email: await emailOf(data.user_id) });
}

/** 확장 연결 끊기(토큰 행 삭제) */
export async function DELETE(req: Request) {
  const h = req.headers.get("authorization") ?? "";
  const m = h.match(/^Bearer ([a-f0-9]{64})$/);
  if (!m) return NextResponse.json({ ok: true });
  await createAdminClient().from(TOKENS).delete().eq("token_hash", hashToken(m[1]));
  return NextResponse.json({ ok: true });
}
