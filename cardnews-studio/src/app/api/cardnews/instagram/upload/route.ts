import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST — 인스타 게시용 카드 이미지(JPEG) 올릴 주소를 만든다. 인스타그램 API는 공개 이미지 주소만 받으므로
 * 회원 폴더(`{userId}/insta/{묶음}/`)에 잠시 올렸다가 게시가 끝나면 지운다.
 */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const body = (await request.json().catch(() => ({}))) as { count?: unknown };
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    return NextResponse.json({ error: "인스타그램에는 1~10장까지 올릴 수 있습니다." }, { status: 400 });
  }
  const batch = crypto.randomUUID();
  const storage = createAdminClient().storage.from("cardnews-images");
  const uploads: { path: string; token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${gate.auth.user.id}/insta/${batch}/${String(i + 1).padStart(2, "0")}.jpg`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) return NextResponse.json({ error: "이미지 올릴 준비를 하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
    uploads.push({ path, token: data.token });
  }
  return NextResponse.json({ uploads });
}
