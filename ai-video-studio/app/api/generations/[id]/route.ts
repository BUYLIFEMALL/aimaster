import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/server";
import { BUCKET, type GenerationRow } from "@/lib/generations";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 회원 본인 영상 삭제 — 저장소 파일을 먼저 지우고 행을 지운다 */
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin.from("avs_generations").select("id, user_id, outputs, start_image, end_image").eq("id", params.id).eq("user_id", user.id).maybeSingle();
  const row = data as Pick<GenerationRow, "id" | "user_id" | "outputs" | "start_image" | "end_image"> | null;
  if (!row) return NextResponse.json({ error: "영상을 찾을 수 없습니다." }, { status: 404 });

  const paths = [...(row.outputs ?? []).map((o) => o.path), row.start_image, row.end_image].filter((p): p is string => !!p).filter((p) => p.startsWith(`${user.id}/`));
  if (paths.length) {
    const { error } = await admin.storage.from(BUCKET).remove(paths);
    if (error) return NextResponse.json({ error: "영상 파일을 지우지 못했습니다. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
  await admin.from("avs_generations").delete().eq("id", row.id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
