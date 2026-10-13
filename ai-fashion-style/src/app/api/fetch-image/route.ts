import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { FetchImageError, fetchImageSafely } from "@/lib/fetchImage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;
const NO_STORE = { "Cache-Control": "private, no-store" };

// 브라우저가 CORS 때문에 직접 못 가져오는 웹 이미지(쇼핑몰 등)를 서버가 안전하게 대신 가져온다.
export async function GET(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  const url = request.nextUrl.searchParams.get("url") ?? "";
  if (!url || url.length > 2000) return NextResponse.json({ error: "이미지 주소를 입력해 주세요." }, { status: 400, headers: NO_STORE });
  try {
    return NextResponse.json({ image: await fetchImageSafely(url) }, { headers: NO_STORE });
  } catch (e) {
    const message = e instanceof FetchImageError ? e.message : "이미지를 가져오지 못했습니다. 이미지를 내려받아 직접 올려 주세요.";
    return NextResponse.json({ error: message }, { status: 400, headers: NO_STORE });
  }
}
