import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, type GenerationRow } from "@/lib/generations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 회원 본인 곡 삭제 — 저장소 파일을 먼저 지우고 행을 지운다 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("ams_generations").select("id, user_id, outputs").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  const row = data as Pick<GenerationRow, "id" | "user_id" | "outputs"> | null;
  if (!row) return NextResponse.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });

  const paths = (row.outputs ?? []).map((o) => o.path).filter((p) => p.startsWith(`${user.id}/`));
  if (paths.length) {
    const { error } = await admin.storage.from(BUCKET).remove(paths);
    if (error) return NextResponse.json({ error: "음원 파일을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
  await admin.from("ams_generations").delete().eq("id", row.id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}

/** v1.05 별 표시·메모 — 회원 본인 행의 options에 star·memo만 합쳐 저장(다른 칸은 바꾸지 않음) */
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { star?: unknown; memo?: unknown };
  const change: Record<string, unknown> = {};
  if (typeof body.star === "boolean") change.star = body.star;
  if (typeof body.memo === "string") change.memo = body.memo.trim().slice(0, 300);
  if (!Object.keys(change).length) return NextResponse.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("ams_generations").select("id, options").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  if (!data) return NextResponse.json({ error: "곡을 찾을 수 없습니다." }, { status: 404 });
  const options = { ...((data.options as Record<string, unknown> | null) ?? {}), ...change };
  const { error } = await admin.from("ams_generations").update({ options }).eq("id", params.id).eq("user_id", user.id);
  if (error) return NextResponse.json({ error: "저장하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ ok: true, options: change });
}
