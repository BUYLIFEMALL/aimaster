import { NextResponse } from "next/server";
import { authorize } from "@/lib/chat/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";
import { previewDocument, updateDocumentCategory } from "@/lib/chat/documents";
import { CompatibleChatError } from "@/lib/compatibleChat/config";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
type Context = { params: Promise<{ id: string }> };
const failure = (e: unknown) => NextResponse.json({ error: e instanceof CompatibleChatError ? e.message : "문서를 처리하지 못했습니다." }, { status: e instanceof CompatibleChatError ? e.status : 500 });

export async function GET(_request: Request, context: Context) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try { return NextResponse.json(await previewDocument(createAdminClient(), gate.auth.user.id, (await context.params).id), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return failure(e); }
}

export async function PATCH(request: Request, context: Context) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "저장할 문서 분류를 확인해 주세요." }, { status: 400 });
  try { return NextResponse.json({ document: await updateDocumentCategory(createAdminClient(), gate.auth.user.id, (await context.params).id, body.category) }); }
  catch (e) { return failure(e); }
}
