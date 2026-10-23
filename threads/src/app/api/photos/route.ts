import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { downloadPhoto, isPhotoProvider, PhotoError, providerLabel, searchPhotos } from "@/lib/photoSearch";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * 글 첨부 이미지 무료 사진(v1.29) — 공용 기준 코드 `free-photo-search` 사본(@/lib/photoSearch) 사용.
 * - search: 회원 본인 Pixabay·Pexels 키로 12장 검색(무료, 결과 저장 안 함)
 * - pick: 고른 사진(제공처 이미지 서버 주소만)을 받아 직접 업로드와 같은 공개 버킷 post-images/<회원>/ 에 저장.
 *   Threads는 JPEG·PNG만 받으므로 그 두 형식만 그대로 저장하고 나머지(WEBP 등)는 거절한다.
 */
export async function POST(request: Request) {
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
    const userId = access.user.id;
    const body = rec(await request.json());
    const supabase = await createClient();

    if (body.action === "pick") {
      const photo = await downloadPhoto(body.url);
      const ext = photo.mime === "image/jpeg" ? "jpg" : photo.mime === "image/png" ? "png" : null;
      if (!ext) return NextResponse.json({ error: "Threads에 올릴 수 없는 형식의 사진입니다. 다른 사진을 골라주세요." }, { status: 400 });
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, photo.bytes, { contentType: photo.mime, upsert: false });
      if (error) {
        console.error("threads photo upload error:", error.message.slice(0, 200));
        return NextResponse.json({ error: "사진을 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
      }
      return NextResponse.json({ url: supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl });
    }

    const provider = body.provider;
    if (!isPhotoProvider(provider)) return NextResponse.json({ error: "사진 제공처를 골라주세요." }, { status: 400 });
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
    if (!query) return NextResponse.json({ error: "검색어를 넣어주세요." }, { status: 400 });

    const key = await getUserApiKey(supabase, userId, provider);
    if (!key) {
      return NextResponse.json(
        { error: `${providerLabel(provider)} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요(무료 발급).`, needApiKey: true, provider },
        { status: 400 },
      );
    }
    // Threads 글 이미지는 세로·가로 모두 쓰이므로 세로(4:5 기준) 검색
    return NextResponse.json({ photos: await searchPhotos(provider, key, query, "4:5") });
  } catch (err) {
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "사진 처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 502 });
  }
}
