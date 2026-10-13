import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { deleteUserGeminiApiKey, getUserGeminiApiKey, maskKey, saveUserGeminiApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const key = await getUserGeminiApiKey(access.user.id);
  return NextResponse.json({ hasKey: !!key, maskedKey: key ? maskKey(key) : null }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  let apiKey = "";
  try { apiKey = String((await request.json()).apiKey ?? "").trim(); } catch { /* 아래에서 처리 */ }
  if (!apiKey) return NextResponse.json({ error: "API 키를 입력해 주세요." }, { status: 400, headers: NO_STORE });
  if (apiKey.length < 20 || apiKey.length > 200 || /\s/.test(apiKey)) {
    return NextResponse.json({ error: "API 키 형식이 올바르지 않습니다. 발급받은 키를 공백 없이 그대로 붙여 넣어 주세요." }, { status: 400, headers: NO_STORE });
  }
  const result = await saveUserGeminiApiKey(access.user.id, apiKey);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}

export async function DELETE() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const result = await deleteUserGeminiApiKey(access.user.id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
