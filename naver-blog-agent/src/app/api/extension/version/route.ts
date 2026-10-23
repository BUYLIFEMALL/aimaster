import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 설치된 크롬 확장이 "새 버전이 있는가"를 확인하는 공개 경로. 회원 데이터가 없고 버전과 다운로드 주소만 돌려준다.
// 값의 출처는 배포된 프로그램 버전(src/lib/version.ts)이라 배포와 항상 같이 바뀐다(ZIP도 같은 빌드에서 만들어짐).
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.json(
    { latest: APP_VERSION, downloadUrl: `${origin}/downloads/naver-blog-agent-extension-latest.zip` },
    { headers: { "Cache-Control": "no-store" } }
  );
}
