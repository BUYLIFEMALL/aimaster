import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { ALL_PROVIDERS, deleteUserApiKey, getRegisteredKeys, maskApiKey, saveUserApiKey } from "@/lib/apiKeys";
import type { Provider } from "@/lib/playlist/types";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const isProvider = (v: unknown): v is Provider => typeof v === "string" && (ALL_PROVIDERS as string[]).includes(v);

/** GET — 내가 등록한 Gemini / OpenAI / Claude 키 상태(마스킹) */
export async function GET() {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return NextResponse.json({ keys: await getRegisteredKeys(auth.user.id) });
}

/** POST — 공급사별 본인 키 저장 { provider, apiKey } */
export async function POST(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = await req.json().catch(() => null);
  if (!isProvider(body?.provider)) return NextResponse.json({ error: "공급사를 선택해 주세요." }, { status: 400 });
  if (typeof body?.apiKey !== "string" || body.apiKey.trim().length < 10) return NextResponse.json({ error: "올바른 API 키를 입력해주세요." }, { status: 400 });
  const res = await saveUserApiKey(auth.user.id, body.provider, body.apiKey);
  if (!res.success) return NextResponse.json({ error: res.error || "키 저장 실패" }, { status: 500 });
  return NextResponse.json({ success: true, maskedKey: maskApiKey(body.apiKey.trim()) });
}

/** DELETE — 공급사별 본인 키 삭제 ?provider=openai */
export async function DELETE(req: Request) {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const provider = new URL(req.url).searchParams.get("provider");
  if (!isProvider(provider)) return NextResponse.json({ error: "공급사를 선택해 주세요." }, { status: 400 });
  await deleteUserApiKey(auth.user.id, provider);
  return NextResponse.json({ success: true });
}
