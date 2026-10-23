import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { deleteResult, getResult } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const row = await getResult(access.user.id, (await ctx.params).id);
  if (!row) return NextResponse.json({ error: "결과를 찾을 수 없습니다." }, { status: 404, headers: NO_STORE });
  return NextResponse.json({ result: row }, { headers: NO_STORE });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const ok = await deleteResult(access.user.id, (await ctx.params).id);
  if (!ok) return NextResponse.json({ error: "삭제하지 못했습니다." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
