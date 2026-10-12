import "server-only";
import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { NEED_KEY_RESPONSE } from "@/lib/gemini";

type AllowedUser = Extract<Awaited<ReturnType<typeof checkProgramAccessApi>>, { allowed: true }>["user"];
type Denied = { error: NextResponse };

/** 로그인·프로그램 이용 권한 확인(키 불필요한 요청용) */
export async function requireAccess(): Promise<Denied | { user: AllowedUser; error?: undefined }> {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  return { user: auth.user };
}

/** 권한 확인 + 회원 본인의 Gemini 키(없으면 안내 응답, 다른 키로 대신하지 않는다) */
export async function requireAccessAndKey(): Promise<Denied | { user: AllowedUser; apiKey: string; error?: undefined }> {
  const auth = await checkProgramAccessApi();
  if (!auth.allowed) return { error: NextResponse.json({ error: auth.error }, { status: auth.status }) };
  const apiKey = await getUserGeminiApiKey(auth.user.id);
  if (!apiKey) return { error: NextResponse.json(NEED_KEY_RESPONSE, { status: 400 }) };
  return { user: auth.user, apiKey };
}

/** data URL 또는 순수 base64 문자열을 Buffer로 바꾼다. 형식이 이상하거나 한도를 넘으면 null */
export function decodeImage(input: unknown, maxBytes: number): Buffer | null {
  if (typeof input !== "string" || input.length < 100) return null;
  const b64 = input.includes(",") ? input.slice(input.indexOf(",") + 1) : input;
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return null;
  const buf = Buffer.from(b64, "base64");
  return buf.length > 0 && buf.length <= maxBytes ? buf : null;
}
