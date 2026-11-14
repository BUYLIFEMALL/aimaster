// 관리자: 게시된 공개 페이지 목록·신고 보기, 내리기·다시 열기(2026-11-14 공개 페이지 1단계)
import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { isAdminUser, emailsOf } from "@/server/adminOnly";
import { adminListPublicPages, adminSetTakedown } from "@/server/publicPages";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

async function admin() {
  const a = await checkProgramAccessApi();
  if (!a.allowed) return { error: NextResponse.json({ message: a.error }, { status: a.status }) };
  if (!(await isAdminUser(a.user.id))) return { error: NextResponse.json({ message: "관리자만 볼 수 있습니다." }, { status: 403 }) };
  return { userId: a.user.id };
}

export async function GET() {
  const a = await admin();
  if ("error" in a) return a.error;
  const rows = adminListPublicPages();
  const emails = await emailsOf(rows.map((r) => r.ownerId));
  return NextResponse.json({ pages: rows.map((r) => ({ ...r, ownerEmail: emails[r.ownerId] ?? "" })) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: NextRequest) {
  const a = await admin();
  if ("error" in a) return a.error;
  const body = (await request.json().catch(() => ({}))) as { pageId?: string; down?: boolean; reason?: string };
  try {
    adminSetTakedown(String(body.pageId ?? ""), !!body.down, a.userId, String(body.reason ?? ""));
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
