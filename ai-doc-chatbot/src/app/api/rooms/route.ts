import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 내 채팅방 목록(최근 대화순 100개) */
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const admin = createAdminClient();
  const userId = gate.auth.user.id;
  // 고정한 대화를 맨 위에(U3). pinned 칸은 0007 마이그레이션으로 추가 — 아직 없으면 고정 없이 최근순으로 돌려준다
  const pinned = await admin.from("dcb_rooms").select("id, title, created_at, updated_at, pinned").eq("user_id", userId).order("pinned", { ascending: false }).order("updated_at", { ascending: false }).limit(100);
  if (!pinned.error) return NextResponse.json({ rooms: pinned.data ?? [], pinSupported: true });
  const { data, error } = await admin.from("dcb_rooms").select("id, title, created_at, updated_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(100);
  if (error) return NextResponse.json({ error: "채팅방 목록을 불러오지 못했습니다." }, { status: 500 });
  return NextResponse.json({ rooms: data ?? [], pinSupported: false });
}

/** DELETE ?id= — 내 채팅방 삭제(메시지도 함께 삭제) */
export async function DELETE(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "삭제할 채팅방을 찾지 못했습니다." }, { status: 400 });
  const { error } = await createAdminClient().from("dcb_rooms").delete().eq("id", id).eq("user_id", gate.auth.user.id);
  if (error) return NextResponse.json({ error: "채팅방을 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
