import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 내 채팅방의 대화(질문·답변·출처·시각) */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 400 });
  const admin = createAdminClient();
  const { data: room } = await admin.from("dcb_rooms").select("id, title, created_at").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
  if (!room) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
  const { data: messages } = await admin
    .from("dcb_messages")
    .select("id, role, content, sources, created_at")
    .eq("room_id", id)
    .eq("user_id", gate.auth.user.id)
    .order("created_at", { ascending: true })
    .limit(500);
  return NextResponse.json({ room, messages: messages ?? [] });
}

/** PATCH { title } — 내 채팅방 이름 바꾸기(U3, 1~60자) */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as { title?: unknown };
  const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim().slice(0, 60) : "";
  if (!title) return NextResponse.json({ error: "대화 이름을 입력해 주세요." }, { status: 400 });
  const { data, error } = await createAdminClient().from("dcb_rooms").update({ title }).eq("id", id).eq("user_id", gate.auth.user.id).select("id, title").maybeSingle();
  if (error) return NextResponse.json({ error: "이름을 바꾸지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ success: true, room: data });
}
