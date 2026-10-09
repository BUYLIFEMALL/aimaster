import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });
  // latestVersion: 프로그램 버전 = 최신 확장 버전(extension/manifest.json의 version_name과 항상 같이 올린다).
  // 확장은 자기 버전이 더 낮으면 "새 버전" 안내를 띄운다.
  return NextResponse.json({
    email: user.email,
    name: user.name,
    isAdmin: user.isAdmin,
    latestVersion: APP_VERSION,
    downloadUrl: `/downloads/naver-blog-seo-studio-extension-latest.zip`,
  });
}
