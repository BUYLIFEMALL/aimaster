import type { NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBloggerAccount, listMyBlogs, selectBlog, disconnectBlogger, getGoogleApp } from "@/lib/googleConnect";
import { connectErrorView } from "@/lib/wordpressConnect";
import { sameOrigin, noStoreJson as json } from "@/lib/requestGuard";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

/** 연결 상태(토큰 없이) + ?blogs=1 이면 내 블로그 목록 */
export async function GET(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const admin = createAdminClient();
  const [account, app] = await Promise.all([loadBloggerAccount(admin, access.user.id), getGoogleApp(admin, access.user.id)]);
  if (!account) return json({ connected: false, hasApp: !!app });
  const extra = account.extra as { blog_id?: string; blog_name?: string; blog_url?: string };
  const base = { connected: true, hasApp: !!app, accountId: account.id, email: account.username, needsReconnect: account.needsReconnect, blog: extra.blog_id ? { id: extra.blog_id, name: extra.blog_name, url: extra.blog_url } : null };
  if (req.nextUrl.searchParams.get("blogs") !== "1") return json(base);
  try {
    return json({ ...base, blogs: await listMyBlogs(admin, access.user.id) });
  } catch (e) {
    const v = connectErrorView(e);
    return json({ ...base, ...v }, v.status);
  }
}

/** 올릴 블로그 고르기 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: "잘못된 요청입니다." }, 403);
  const access = await checkProgramAccessApi();
  if (!access.allowed) return json({ error: access.error }, access.status);
  const body = (await req.json().catch(() => null)) as { blogId?: unknown } | null;
  if (!body || typeof body.blogId !== "string" || !/^\d{1,30}$/.test(body.blogId)) return json({ error: "블로그를 골라 주세요." }, 400);
  try {
    return json({ ok: true, blog: await selectBlog(createAdminClient(), access.user.id, body.blogId) });
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
  const ok = await disconnectBlogger(createAdminClient(), access.user.id, body.accountId);
  return ok ? json({ ok: true }) : json({ error: "연결을 찾지 못했습니다." }, 404);
}
