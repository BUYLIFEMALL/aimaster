import { NextResponse } from "next/server";
import { authorize, errorJson } from "@/lib/apiGuard";
import { listAisImages } from "@/lib/music/aisImages";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// v1.24 내 AI 이미지 스튜디오 이미지 목록(참고 이미지로 가져오기용). 회원 본인 것만, 읽기만.
export async function GET() {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  try {
    return NextResponse.json({ images: await listAisImages(gate.auth.user.id) });
  } catch (err) {
    console.error("ais images error:", String((err as Error)?.message ?? "").slice(0, 200));
    return errorJson("AI 이미지 스튜디오 이미지를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요.", 500);
  }
}
