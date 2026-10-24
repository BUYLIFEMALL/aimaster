import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompatibleChatError } from "@/lib/compatibleChat/config";
import { createBot, deleteBot, listBots, updateBot } from "@/lib/bots/store";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function handle(request: Request, method: "GET" | "POST" | "PATCH" | "DELETE") {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try {
    const store = createAdminClient(), userId = gate.auth.user.id;
    if (method === "GET") return NextResponse.json(await listBots(store, userId), { headers: { "Cache-Control": "private, no-store" } });
    const input: unknown = await request.json().catch(() => null);
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new CompatibleChatError("봇 설정 요청을 확인해 주세요.");
    const body = input as Record<string, unknown>;
    if (method === "POST") return NextResponse.json({ bot: await createBot(store, userId, body) }, { status: 201 });
    if (method === "PATCH") return NextResponse.json({ bot: await updateBot(store, userId, body.id, body, body.revision) });
    await deleteBot(store, userId, body.id, body.revision);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CompatibleChatError ? error.message : "봇 요청을 처리하지 못했습니다." }, { status: error instanceof CompatibleChatError ? error.status : 500 });
  }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const PATCH = (request: Request) => handle(request, "PATCH");
export const DELETE = (request: Request) => handle(request, "DELETE");
