import { NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { addMine, deleteMine, PromptError } from "@/lib/promptStore";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (e: unknown, fallback: string) =>
  NextResponse.json({ error: e instanceof PromptError ? e.message : fallback }, { status: e instanceof PromptError ? e.status : 500 });

/** 내 프롬프트 저장(본인만, 30일) */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    const saved = await addMine(user.id, await request.json().catch(() => ({})));
    await logProgramUsage(user.id, "prompt_save", 1);
    return NextResponse.json({ prompt: saved }, { headers: NO_STORE });
  } catch (e) {
    return fail(e, "저장하지 못했습니다.");
  }
}

/** 내 프롬프트 지우기 — ?id=<uuid> */
export async function DELETE(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    await deleteMine(user.id, new URL(request.url).searchParams.get("id"));
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return fail(e, "지우지 못했습니다.");
  }
}
