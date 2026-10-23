import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { deleteUserApiKey, getUserApiKeys, isKeyProvider, KEY_PROVIDERS, maskKey, saveUserApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const keys: Record<string, { hasKey: boolean; maskedKey: string | null }> = {};
  const stored = await getUserApiKeys(access.user.id, KEY_PROVIDERS);
  for (const p of KEY_PROVIDERS) {
    const k = stored[p];
    keys[p] = { hasKey: !!k, maskedKey: k ? maskKey(k) : null };
  }
  return NextResponse.json({ keys }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  let body: { provider?: unknown; apiKey?: unknown } = {};
  try { body = await request.json(); } catch { /* 아래에서 처리 */ }
  if (!isKeyProvider(body.provider)) return NextResponse.json({ error: "키 종류가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  const apiKey = String(body.apiKey ?? "").trim();
  if (!apiKey) return NextResponse.json({ error: "API 키를 입력해 주세요." }, { status: 400, headers: NO_STORE });
  // 검색광고 고객 ID는 숫자 몇 자리라 Gemini 키보다 짧다
  const minLen = body.provider === "gemini" ? 16 : 3;
  if (apiKey.length < minLen || apiKey.length > 200 || /\s/.test(apiKey)) {
    return NextResponse.json({ error: "API 키 형식이 올바르지 않습니다. 발급받은 키를 공백 없이 그대로 붙여 넣어 주세요." }, { status: 400, headers: NO_STORE });
  }
  const result = await saveUserApiKey(access.user.id, body.provider, apiKey);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}

export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const provider = request.nextUrl.searchParams.get("provider");
  if (!isKeyProvider(provider)) return NextResponse.json({ error: "키 종류가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  const result = await deleteUserApiKey(access.user.id, provider);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
