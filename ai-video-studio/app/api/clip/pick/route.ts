import { NextResponse } from "next/server";
import { checkProgramAccessApi, logProgramUsage } from "@/lib/access";
import { ClipError, pickClips, readSegs } from "@/lib/clip/clipServer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 90;

/** 긴 영상 → 쇼츠(v1.27): 받아쓴 문장으로 쇼츠 구간 1~3개 고르기(회원 본인 키, 재시도 없음) */
export async function POST(request: Request) {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const body = await request.json().catch(() => ({}));
  const segs = readSegs(body.segments);
  if (segs.length < 2) return NextResponse.json({ error: "받아쓴 문장이 너무 적습니다. 말소리가 있는 영상을 넣어 주세요." }, { status: 400 });
  try {
    const r = await pickClips(user.id, segs);
    await logProgramUsage(user.id, "clip_pick", 1, { model: r.model, segments: segs.length, picks: r.picks.length });
    return NextResponse.json(r, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const err = e instanceof ClipError ? e : new ClipError(500, "구간을 고르지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
    return NextResponse.json({ error: err.message, needKey: err.needKey }, { status: err.status });
  }
}
