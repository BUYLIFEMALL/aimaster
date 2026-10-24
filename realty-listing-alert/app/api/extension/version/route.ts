import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 공개 새 버전 확인(기준: naver-blog-agent /api/extension/version). 연결 전에도 확장이 6시간마다 묻는다. 회원 정보 없음.
export async function GET() {
  return NextResponse.json({
    latestVersion: APP_VERSION,
    downloadUrl: "https://realty-listing-alert.buylife.xyz/downloads/realty-listing-alert-extension-latest.zip",
  });
}
