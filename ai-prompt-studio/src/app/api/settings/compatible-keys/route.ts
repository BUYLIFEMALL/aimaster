import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { CompatibleChatError } from "@/lib/compatibleChat/config";
import { compatibleKeys, deleteCompatibleKey, saveCompatibleKey } from "@/lib/compatibleChat/keyStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function handle(request: Request, method: "GET" | "POST" | "DELETE") {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const store = createAdminClient();
    const userId = access.user.id;
    if (method === "GET") return NextResponse.json({ keys: await compatibleKeys(store, userId) }, { headers: { "Cache-Control": "private, no-store" } });
    if (method === "POST") {
      const body = await request.json().catch(() => null) as { provider?: unknown; apiKey?: unknown } | null;
      if (!body) return NextResponse.json({ error: "키 등록 요청을 확인해 주세요." }, { status: 400 });
      await saveCompatibleKey(store, userId, body.provider, body.apiKey);
    } else await deleteCompatibleKey(store, userId, new URL(request.url).searchParams.get("provider"));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof CompatibleChatError ? error.message : "공용 키 요청을 처리하지 못했습니다." }, { status: error instanceof CompatibleChatError ? error.status : 500 });
  }
}
export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
export const DELETE = (request: Request) => handle(request, "DELETE");
