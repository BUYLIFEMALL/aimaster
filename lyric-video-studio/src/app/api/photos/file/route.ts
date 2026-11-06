import { NextResponse, type NextRequest } from "next/server";
import { fail, guard } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { PhotoError, downloadPhoto } from "@/lib/photoSearch";

// L-3 고른 배경 사진을 우리 서버를 거쳐 건넨다 — 다른 사이트 그림을 캔버스에 바로 그리면 MP4로 내보낼 수 없어서(같은 출처로 받기).
// 제공처 이미지 서버 주소만, 리디렉션 거부, 8MB까지(공용 downloadPhoto). 서버에 저장하지 않는다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const { bytes, mime } = await downloadPhoto(request.nextUrl.searchParams.get("url"), { signal: request.signal }).catch((e) => {
      throw e instanceof PhotoError ? new UserError(e.status, e.message) : e;
    });
    return new NextResponse(new Uint8Array(bytes), { headers: { "Content-Type": mime, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return fail(e); }
}
