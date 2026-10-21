import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SHOP_IMAGE_BUCKET } from "@/lib/imageSrc";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const SIGNED_URL_SECONDS = 60 * 60;

/**
 * v1.15: 비공개 버킷 이미지를 <img>로 보여주기 위한 경로. 로그인한 회원 본인 폴더
 * (`<회원id>/...`)의 파일만 짧게 유효한 서명 주소로 넘겨준다(다른 회원 경로는 403,
 * 버킷 읽기 RLS도 본인 폴더만 허용). 읽기 전용이라 권한 판정은 로그인·소유자 확인까지만 한다
 * — 이미지마다 프로그램 권한 조회를 반복하면 화면 한 번에 수십 번 DB를 부르게 된다.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("p") ?? "";
  if (!path || path.includes("..")) {
    return NextResponse.json({ error: "잘못된 이미지 경로입니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (!path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "본인 이미지만 볼 수 있습니다." }, { status: 403 });
  }

  const { data, error } = await supabase.storage
    .from(SHOP_IMAGE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "이미지를 찾을 수 없습니다." }, { status: 404 });
  }

  const res = NextResponse.redirect(data.signedUrl, 302);
  // 서명 주소 유효시간보다 짧게, 본인 브라우저에만 캐시한다.
  res.headers.set("Cache-Control", "private, max-age=3000");
  return res;
}
