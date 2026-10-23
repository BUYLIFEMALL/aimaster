import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { guard, fail, json } from "@/lib/route";
import { db, hash, table, projectFor, currentFor, assetsFor } from "@/lib/store";
import { checkProgramAccess } from "@/lib/programAccess";
import { UserError } from "@/lib/errors";
import { APP_SLUG, APP_VERSION, APP_URL, DOWNLOAD_PATH } from "@/lib/version";
import { articleHtml, activeAssets } from "@/lib/content";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function POST(req: NextRequest) { try {
  const { userId, body } = await guard(req);
  if (body.action === "revoke") { const { error } = await db().from(table("extension_tokens")).update({ revoked_at: new Date().toISOString() }).eq("user_id", userId).is("revoked_at", null); if (error) throw new UserError(503, "연결 해제에 실패했습니다."); return json({ ok: true }); }
  if (body.action !== "issue") throw new UserError(400, "지원하지 않는 연결 요청입니다.");
  const token = randomBytes(32).toString("base64url"); const { error } = await db().from(table("extension_tokens")).insert({ user_id: userId, token_hash: hash(token) });
  if (error) throw new UserError(503, "연결 코드를 만들지 못했습니다."); return json({ token, expiresInDays: 7 });
} catch (e) { return fail(e); } }
export async function GET(req: NextRequest) { try {
  if (req.nextUrl.searchParams.get("version") === "1") return json({ version: APP_VERSION, downloadUrl: APP_URL + DOWNLOAD_PATH });
  const token = req.headers.get("authorization")?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]; if (!token) throw new UserError(401, "연결 코드를 확인해 주세요.");
  const { data } = await db().from(table("extension_tokens")).select("user_id").eq("token_hash", hash(token)).is("revoked_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (!data) throw new UserError(401, "연결 코드가 만료됐거나 해제됐습니다.");
  const access = await checkProgramAccess(db(), data.user_id, APP_SLUG); if (!access.allowed) throw new UserError(403, "프로그램 이용 권한을 확인해 주세요.");
  const id = req.nextUrl.searchParams.get("project");
  if (!id) { const { data: projects, error } = await db().from(table("projects")).select("id,title,current_revision_id,updated_at").eq("user_id", data.user_id).not("current_revision_id", "is", null).gt("expires_at", new Date().toISOString()).order("updated_at", { ascending: false }).limit(40); if (error) throw new UserError(503, "원고 목록을 읽지 못했습니다."); return json({ projects, version: APP_VERSION }); }
  const p = await projectFor(data.user_id, id), r = await currentFor(data.user_id, p), assets = activeAssets(await assetsFor(data.user_id, p.id), r.data.media);
  const title = r.data.title, html = articleHtml(r.data, assets).replace(/^<article><h1>[\s\S]*?<\/h1>/, "<article>");
  return json({ projectId: p.id, revisionId: r.id, title, body: r.data.body, html, tags: r.data.tags, images: assets, version: APP_VERSION });
} catch (e) { return fail(e); } }
