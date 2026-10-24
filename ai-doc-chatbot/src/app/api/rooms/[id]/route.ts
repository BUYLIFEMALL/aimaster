import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveBot } from "@/lib/bots/store";
import { CompatibleChatError } from "@/lib/compatibleChat/config";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** GET — 내 채팅방의 대화(질문·답변·출처·시각) */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 400 });
  const admin = createAdminClient();
  const { data: room } = await admin.from("dcb_rooms").select("id, title, created_at, bot_ref").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
  if (!room) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
  const { data: messages } = await admin
    .from("dcb_messages")
    .select("id, role, content, sources, created_at, generation_context")
    .eq("room_id", id)
    .eq("user_id", gate.auth.user.id)
    .order("created_at", { ascending: true })
    .limit(500);
  return NextResponse.json({ room, messages: messages ?? [] });
}

/** PATCH { title } 또는 { pinned } — 내 채팅방 이름 바꾸기(1~60자)·고정(U3) */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 400 });
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) return NextResponse.json({ error: "변경 요청을 확인해 주세요." }, { status: 400 });
  const body = input as Record<string, unknown>;
  const patch: { title?: string; pinned?: boolean; bot_ref?: string | null } = {};
  const admin = createAdminClient();
  if (body.botRef !== undefined) {
    const { data: ownRoom, error } = await admin.from("dcb_rooms").select("id").eq("id", id).eq("user_id", gate.auth.user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "채팅방을 확인하지 못했습니다." }, { status: 500 });
    if (!ownRoom) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
    try { patch.bot_ref = (await resolveBot(admin, gate.auth.user.id, body.botRef))?.id ?? null; }
    catch (error) { return NextResponse.json({ error: error instanceof CompatibleChatError ? error.message : "봇을 선택하지 못했습니다." }, { status: error instanceof CompatibleChatError ? error.status : 500 }); }
  }
  if (typeof body.pinned === "boolean") patch.pinned = body.pinned;
  if (body.title !== undefined) {
    const title = typeof body.title === "string" ? body.title.replace(/\s+/g, " ").trim().slice(0, 60) : "";
    if (!title) return NextResponse.json({ error: "대화 이름을 입력해 주세요." }, { status: 400 });
    patch.title = title;
  }
  if (!Object.keys(patch).length) return NextResponse.json({ error: "바꿀 내용이 없습니다." }, { status: 400 });
  const { data, error } = await admin.from("dcb_rooms").update(patch).eq("id", id).eq("user_id", gate.auth.user.id).select("id, title, bot_ref").maybeSingle();
  if (error) return NextResponse.json({ error: patch.bot_ref !== undefined ? "봇 선택을 저장하지 못했습니다." : patch.pinned !== undefined ? "대화 고정 기능이 아직 준비되지 않았습니다. 잠시 뒤 다시 시도해 주세요." : "이름을 바꾸지 못했습니다." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "채팅방을 찾지 못했습니다." }, { status: 404 });
  return NextResponse.json({ success: true, room: data });
}
