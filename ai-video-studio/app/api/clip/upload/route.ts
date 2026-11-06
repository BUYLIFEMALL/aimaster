import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { ClipError, createAudioUpload } from "@/lib/clip/clipServer";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** 긴 영상 → 쇼츠(v1.27): 받아쓰기용 소리 파일 일회용 업로드 주소(회원 폴더) */
export async function POST() {
  const { user, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  try {
    return NextResponse.json(await createAudioUpload(user.id), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const err = e instanceof ClipError ? e : new ClipError(500, "업로드 주소를 만들지 못했습니다.");
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
}
