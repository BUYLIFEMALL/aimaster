import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRACKS_TABLE } from "@/lib/tracks";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Ctx = { params: Promise<{ id: string }> };

// 기록 지우기 — id와 user_id를 함께 걸어 본인 곡만. 내 PC 음원 파일은 화면이 엔진에 따로 지우라고 보낸다.
export async function DELETE(_request: Request, { params }: Ctx) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const { id } = await params;
  const { error } = await createAdminClient().from(TRACKS_TABLE).delete().eq("id", id).eq("user_id", access.user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
