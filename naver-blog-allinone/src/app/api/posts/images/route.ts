import { NextResponse } from "next/server";
import { authorize } from "@/lib/apiAccess";
import { BUCKET, imagePrefix } from "@/lib/blog/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const DATA_URL = /^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_FILES_PER_USER = 600;

/** 브라우저가 줄여 보낸 이미지(WebP/JPEG/PNG data URL)를 내 폴더에 저장하고 공개 주소를 돌려준다. */
export async function POST(request: Request) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;

  let body: { dataUrl?: unknown };
  try {
    body = (await request.json()) as { dataUrl?: unknown };
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }
  const m = typeof body.dataUrl === "string" ? DATA_URL.exec(body.dataUrl) : null;
  if (!m) return NextResponse.json({ error: "이미지 파일(JPG·PNG·WebP)만 저장할 수 있습니다." }, { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  if (!bytes.length || bytes.length > MAX_BYTES) return NextResponse.json({ error: "이미지 용량이 너무 큽니다. 더 작은 이미지로 시도해주세요." }, { status: 400 });

  const admin = createAdminClient();
  const list = await admin.storage.from(BUCKET).list(gate.userId, { limit: MAX_FILES_PER_USER + 1 });
  if ((list.data?.length ?? 0) > MAX_FILES_PER_USER) {
    return NextResponse.json({ error: "저장된 이미지가 너무 많습니다. 쓰지 않는 글을 삭제해 이미지를 정리해주세요." }, { status: 400 });
  }

  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const path = `${gate.userId}/${crypto.randomUUID()}.${ext}`;
  const up = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: `image/${m[1]}`, upsert: false });
  if (up.error) {
    console.error("allinone image upload error:", up.error.message.slice(0, 200));
    return NextResponse.json({ error: "이미지를 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
  }
  return NextResponse.json({ url: `${imagePrefix(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", gate.userId)}${path.slice(gate.userId.length + 1)}` });
}
