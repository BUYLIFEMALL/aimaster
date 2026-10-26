import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";

/** 확장 새 버전 알림용 — 프로그램 버전 = 확장 버전 */
export function GET() {
  return NextResponse.json({
    latest: APP_VERSION,
    downloadUrl: "https://smartstore-register.buylife.xyz/downloads/smartstore-register-extension-latest.zip",
  });
}
