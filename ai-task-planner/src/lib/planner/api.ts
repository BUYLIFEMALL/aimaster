import { NextResponse } from "next/server";
import { z } from "zod";
import { checkProgramAccessApi } from "../access";
import { platformConfigured } from "../config";
import { PlannerError } from "./engine";
export const NO_STORE = { "Cache-Control": "private, no-store" };
export async function authorizePlanner() {
  if (!platformConfigured()) throw new PlannerError("로그인 연결과 회원별 기록 저장을 준비하고 있습니다.", 503);
  const access = await checkProgramAccessApi();
  if (!access.allowed) throw new PlannerError(access.error, access.status);
  return access.user;
}
export function plannerFailure(error: unknown) {
  if (error instanceof PlannerError) return NextResponse.json({ error: error.message }, { status: error.status, headers: NO_STORE });
  if (error instanceof z.ZodError) return NextResponse.json({ error: "입력 값과 결과 형식을 확인해주세요." }, { status: 400, headers: NO_STORE });
  return NextResponse.json({ error: "서버에 연결하지 못했습니다. 다시 시도해주세요." }, { status: 503, headers: NO_STORE });
}
