import { NextResponse } from "next/server";
import { checkAdminApi, logProgramUsage } from "@/lib/access";
import { PromptError, savePreset } from "@/lib/promptStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 게시판 예시 추가·고치기·숨기기·순서(관리자만) — 모든 회원이 보는 공용 예시 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkAdminApi();
  if (errorResponse) return errorResponse;
  try {
    const preset = await savePreset(await request.json().catch(() => ({})));
    await logProgramUsage(user.id, "prompt_preset_save", 1, { id: preset.id });
    return NextResponse.json({ preset }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return NextResponse.json({ error: e instanceof PromptError ? e.message : "예시를 저장하지 못했습니다." }, { status: e instanceof PromptError ? e.status : 500 });
  }
}
