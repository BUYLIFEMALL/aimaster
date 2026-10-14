import { NextResponse, type NextRequest } from "next/server";
import { fail, guardAi, json } from "@/lib/aiRoute";
import { detectHead } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const MAX_B64 = 3_000_000;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * 생성된 사진에서 정수리·턱 위치(이미지 높이 대비 0~1)를 AI로 추정한다. 회원 본인 Gemini 키 1회 호출.
 * 이미지는 서버에 저장하지 않는다. 결과는 참고용 추정치이며 합격을 보장하지 않는다.
 */
export async function POST(request: NextRequest) {
  const g = await guardAi(request, MAX_B64 + 2_000);
  if (g instanceof NextResponse) return g;
  const img = g.body.image as { data?: unknown; mimeType?: unknown } | undefined;
  if (!img || typeof img.data !== "string" || typeof img.mimeType !== "string") return json({ error: "사진이 없습니다." }, 400);
  if (!["image/jpeg", "image/png", "image/webp"].includes(img.mimeType)) return json({ error: "지원하지 않는 이미지 형식입니다." }, 400);
  if (img.data.length < 100 || img.data.length > MAX_B64 || !B64.test(img.data)) return json({ error: "사진 데이터가 올바르지 않습니다." }, 400);
  try {
    const r = await detectHead(g.apiKey, img.data, img.mimeType);
    return json(r);
  } catch (e) {
    return fail(e);
  }
}
