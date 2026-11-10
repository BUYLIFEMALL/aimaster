import type { NextRequest } from "next/server";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectWordpress, loadWordpressConnection, disconnectWordpress, connectErrorView, safeFetchImpl } from "@/lib/wordpressConnect";
import { listCategories } from "@/lib/publish/wordpress";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

/** 현재 연결(비밀번호 없이) + ?categories=1 이면 카테고리 목록 */
export async function GET(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const admin = createAdminClient();
  const conn = await loadWordpressConnection(admin, access.user.id);
  if (!conn) return json({ connected: false });
  const base = { connected: true, accountId: conn.accountId, siteUrl: conn.siteUrl, username: conn.username };
  if (req.nextUrl.searchParams.get("categories") !== "1") return json(base);
  try {
    const categories = await listCategories(conn, { fetchImpl: safeFetchImpl });
    return json({ ...base, categories });
  } catch (e) {
    const v = connectErrorView(e);
    return json({ ...base, ...v }, v.status);
  }
}

/** 연결(연결 확인 + 저장) */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = (await req.json().catch(() => null)) as { siteUrl?: unknown; username?: unknown; appPassword?: unknown } | null;
  if (!body || typeof body.siteUrl !== "string" || typeof body.username !== "string" || typeof body.appPassword !== "string") {
    return json({ error: "사이트 주소·사용자명·응용 비밀번호를 모두 넣어 주세요." }, 400);
  }
  try {
    const r = await connectWordpress(createAdminClient(), access.user.id, { siteUrl: body.siteUrl, username: body.username, appPassword: body.appPassword });
    return json({ ok: true, ...r });
  } catch (e) {
    const v = connectErrorView(e);
    return json(v, v.status);
  }
}

/** 연결 끊기 */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = (await req.json().catch(() => null)) as { accountId?: unknown } | null;
  if (!body || typeof body.accountId !== "string") return json({ error: "잘못된 요청입니다." }, 400);
  const ok = await disconnectWordpress(createAdminClient(), access.user.id, body.accountId);
  return ok ? json({ ok: true }) : json({ error: "연결을 찾지 못했습니다." }, 404);
}
