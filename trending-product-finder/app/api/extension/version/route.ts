import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DOWNLOAD_URL = "https://trending-product-finder.buylife.xyz/downloads/trending-product-finder-extension-latest.zip";

// 확장 창이 「새 버전이 있습니다」를 보여 주려고 읽는 공개 정보. 회원 정보·키는 없다.
// 확장 버전은 배포 때 lib/version.ts와 같은 값으로 맞춘다(scripts/build-extension-archive.mjs).
export async function GET() {
  return NextResponse.json(
    { version: APP_VERSION, downloadUrl: DOWNLOAD_URL },
    { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
}
