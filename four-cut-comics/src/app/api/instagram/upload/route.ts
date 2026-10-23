import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_INSTA_PHOTOS } from "@/lib/instagram/feed";
import { INSTA_BUCKET } from "@/lib/instagram/posting";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/** POST — 게시할 사진(JPEG)을 올릴 주소를 만든다. 회원 폴더 `{userId}/fourcut-insta/{묶음}/`에 잠시 두고 게시 뒤 지운다. */
export async function POST(request: Request) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = (await request.json().catch(() => ({}))) as { count?: unknown };
  const count = Number(body.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_INSTA_PHOTOS) {
    return NextResponse.json({ error: `인스타그램에는 1~${MAX_INSTA_PHOTOS}장까지 올릴 수 있습니다.` }, { status: 400 });
  }
  const batch = crypto.randomUUID();
  const storage = createAdminClient().storage.from(INSTA_BUCKET);
  const uploads: { path: string; token: string }[] = [];
  for (let i = 0; i < count; i++) {
    const path = `${access.user.id}/fourcut-insta/${batch}/${String(i + 1).padStart(2, "0")}.jpg`;
    const { data, error } = await storage.createSignedUploadUrl(path);
    if (error || !data) {
      return NextResponse.json({ error: "사진 올릴 준비를 하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
    }
    uploads.push({ path, token: data.token });
  }
  return NextResponse.json({ uploads });
}
