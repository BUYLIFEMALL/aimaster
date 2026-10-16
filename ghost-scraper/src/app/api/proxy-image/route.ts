import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { safeFetch, BlockedUrlError } from "@/lib/safeFetch";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return new NextResponse(access.error, { status: access.status });
  }

  const urlParam = req.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return new NextResponse("이미지 URL이 필요합니다.", { status: 400 });
  }

  try {
    const { response } = await safeFetch(urlParam, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Accept: "image/*,*/*;q=0.8",
      },
    });

    if (!response.ok) {
      return new NextResponse(`이미지 다운로드 실패 (HTTP ${response.status})`, {
        status: response.status,
      });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    // 이미지 전용 통로 — HTML 등 다른 형식을 우리 도메인으로 내려주지 않는다.
    if (!contentType.startsWith("image/")) {
      return new NextResponse("이미지 형식이 아닙니다.", { status: 415 });
    }
    const arrayBuffer = await response.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
        // SVG를 직접 열더라도 외부 이미지의 스크립트를 우리 도메인 권한으로 실행하지 않는다.
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (err: any) {
    if (err instanceof BlockedUrlError) {
      return new NextResponse(err.message, { status: 400 });
    }
    return new NextResponse(`이미지 프록시 오류: ${err.message}`, { status: 500 });
  }
}
