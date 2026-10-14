import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { insertResult } from "@/lib/results";
import { getTest } from "@/lib/tests/registry";
import { scoreTest, validateAnswers } from "@/lib/tests/scoring";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };

/** 답변을 받아 서버가 점수를 다시 계산하고 결과를 저장한다(AI 호출 없음 — 키 불필요). */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const raw = await request.text();
  if (raw.length > 20_000) return NextResponse.json({ error: "요청 내용이 너무 큽니다." }, { status: 413, headers: NO_STORE });
  let body: { testId?: unknown; answers?: unknown } = {};
  try { body = JSON.parse(raw); } catch { /* 아래에서 처리 */ }
  const test = typeof body.testId === "string" ? getTest(body.testId) : undefined;
  if (!test) return NextResponse.json({ error: "알 수 없는 검사입니다." }, { status: 400, headers: NO_STORE });
  const v = validateAnswers(test, body.answers);
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400, headers: NO_STORE });
  const result = scoreTest(test, v.answers);
  const saved = await insertResult(access.user.id, test.id, result, v.answers);
  if (!saved) return NextResponse.json({ error: "결과를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers: NO_STORE });
  return NextResponse.json({ id: saved.id }, { headers: NO_STORE });
}
