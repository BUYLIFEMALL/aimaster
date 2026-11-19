import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getRegisteredConvertKeys, getUserApiKey } from "@/lib/apiKeys";
import { ConvertError } from "@/lib/convert/protocol";
import { convertBatch, convertStatus } from "@/lib/convert/service";

// 한글→영문 변환(선택 기능). 이 프로그램의 유일한 AI 호출 경로다.
// - 로그인 + 이 프로그램 이용 권한이 있는 회원만(checkProgramAccessApi). 등록 전에는 누구도 통과하지 못한다.
// - 회원 본인 user_api_keys 키만 쓴다. 키는 서버에서만 읽고 응답·기록에 넣지 않는다.
// - 한 요청에 모델 호출 1번, 재시도 0. 한글 원문·영문 결과를 저장하거나 기록(log)에 남기지 않는다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error: string, status: number, code = "error") => NextResponse.json({ error, code }, { status, headers: NO_STORE });

/** 등록된 키(있음·없음만)와 고를 수 있는 모델. AI 호출이 아니다 */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return fail(access.error, access.status, "access");
  try {
    return NextResponse.json(convertStatus(await getRegisteredConvertKeys(access.user.id)), { headers: NO_STORE });
  } catch {
    return fail("등록된 키를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}

export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return fail(access.error, access.status, "access");
  // 다른 사이트에서 보낸 요청은 받지 않는다(회원 키로 유료 호출이 나가는 경로).
  const origin = request.headers.get("origin");
  let sameSite = false;
  try {
    sameSite = !!origin && new URL(origin).host === new URL(request.url).host;
  } catch {
    sameSite = false;
  }
  if (!sameSite) return fail("이 프로그램 화면에서 다시 요청해 주세요.", 403, "origin");
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 20_000) return fail("요청이 너무 큽니다.", 413, "invalid");
    body = JSON.parse(raw);
  } catch {
    return fail("요청 내용을 읽지 못했습니다.", 400, "invalid");
  }
  const userId = access.user.id;
  try {
    const out = await convertBatch(body, { getKey: (provider) => getUserApiKey(userId, provider), signal: request.signal });
    return NextResponse.json(out, { headers: NO_STORE });
  } catch (e) {
    if (e instanceof ConvertError) return fail(e.message, e.status, e.code);
    // 플랫폼·DB 오류 원문에는 키나 내부 정보가 섞일 수 있어 그대로 내보내지 않는다.
    return fail("변환하지 못했습니다. 설명은 그대로 두었습니다. 잠시 뒤 직접 다시 시도해 주세요.", 500);
  }
}
