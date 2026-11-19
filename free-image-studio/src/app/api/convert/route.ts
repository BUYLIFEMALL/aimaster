import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getRegisteredConvertKeys, getUserApiKey } from "@/lib/apiKeys";
import { handleConvertPost } from "@/lib/convert/handler";
import { convertStatus } from "@/lib/convert/service";

// 한글→영문 변환(선택 기능). 이 프로그램의 유일한 AI 호출 경로다.
// - 로그인 + 이 프로그램 이용 권한이 있는 회원만(checkProgramAccessApi). 등록 전에는 누구도 통과하지 못한다.
// - 회원 본인 user_api_keys 키만 쓴다. 키는 서버에서만 읽고 응답·기록에 넣지 않는다.
// - 한 요청에 모델 호출 1번, 재시도 0. 한글 원문·영문 결과를 저장하거나 기록(log)에 남기지 않는다.
// - 처리 순서(권한 → 출처 → 본문 크기 → 동의 표시 → 변환)는 src/lib/convert/handler.ts에 있다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

const NO_STORE = { "Cache-Control": "private, no-store" };

async function checkAccess() {
  const access = await checkProgramAccessApi();
  return access.allowed ? ({ allowed: true, userId: access.user.id } as const) : access;
}

/** 등록된 키(있음·없음만)와 고를 수 있는 모델. AI 호출이 아니다 */
export async function GET() {
  const access = await checkAccess();
  if (!access.allowed) return NextResponse.json({ error: access.error, code: "access" }, { status: access.status, headers: NO_STORE });
  try {
    return NextResponse.json(convertStatus(await getRegisteredConvertKeys(access.userId)), { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: "등록된 키를 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.", code: "error" }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request: Request) {
  const reply = await handleConvertPost(request, { checkAccess, getKey: getUserApiKey });
  return NextResponse.json(reply.body, { status: reply.status, headers: NO_STORE });
}
