import { NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { ClipError, transcribeAudio } from "@/lib/clip/clipServer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

/** 긴 영상 → 쇼츠(v1.27)·해설 교차편집: 올린 소리를 회원이 고른 받아쓰기 모델(v1.31 — Gemini 3.8 Flash·Flash Lite·whisper-1)의 본인 키로 받아쓰고 소리 파일은 바로 지운다 */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  try {
    const r = await transcribeAudio(user.id, body.path, body.model);
    await logProgramUsage(user.id, "clip_transcribe", 1, { seconds: Math.round(r.duration), segments: r.segments.length, model: r.model });
    return NextResponse.json(r, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const err = e instanceof ClipError ? e : new ClipError(500, "받아쓰기에 실패했습니다. 잠시 뒤 다시 시도해 주세요.");
    return NextResponse.json({ error: err.message, needKey: err.needKey }, { status: err.status });
  }
}
