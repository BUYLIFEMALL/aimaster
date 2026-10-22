import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { getUserApiKey } from "@/lib/cardnews/apiKeys";
import { optimizeBackground } from "@/lib/cardnews/ai/imageOptimize";
import { downloadPhoto, isPhotoProvider, PhotoError, providerLabel, searchPhotos } from "@/lib/cardnews/photoSearch";
import { createAdminClient } from "@/lib/cardnews/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/**
 * 배경 무료 사진(v1.63).
 * - search: 회원 본인 Pixabay·Pexels 키로 12장 검색(무료, 결과는 저장하지 않음)
 * - pick: 고른 사진(제공처 이미지 서버 주소만)을 받아 WebP로 줄여 이 회원 폴더에 저장 → 공개 주소(인스타 게시에 필요)
 */
export async function POST(request: Request) {
  try {
    const gate = await authorize();
    if (!gate.ok) return gate.response;
    const userId = gate.auth.user.id;
    const body = rec(await request.json());

    if (body.action === "pick") {
      const photo = await downloadPhoto(body.url);
      const optimized = await optimizeBackground(photo.bytes, photo.mime);
      const path = `${userId}/${crypto.randomUUID()}.${optimized.ext}`;
      const admin = createAdminClient();
      const { error } = await admin.storage.from("cardnews-images").upload(path, optimized.bytes, { contentType: optimized.mime, upsert: false });
      if (error) {
        console.error("cardnews photo upload error:", error.message.slice(0, 200));
        return NextResponse.json({ error: "사진을 저장하지 못했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 500 });
      }
      const { data } = admin.storage.from("cardnews-images").getPublicUrl(path);
      return NextResponse.json({ url: data.publicUrl });
    }

    const provider = body.provider;
    if (!isPhotoProvider(provider)) return NextResponse.json({ error: "사진 제공처를 골라주세요." }, { status: 400 });
    const query = typeof body.query === "string" ? body.query.trim().slice(0, 100) : "";
    if (!query) return NextResponse.json({ error: "검색어를 넣어주세요." }, { status: 400 });
    const ratio = body.ratio === "1:1" ? "1:1" : "4:5";

    const key = await getUserApiKey(userId, provider);
    if (!key) {
      return NextResponse.json(
        { error: `${providerLabel(provider)} API 키가 없습니다. [API키등록·플랫폼연동]에서 본인 키를 먼저 등록해주세요(무료 발급).`, needApiKey: true, provider },
        { status: 400 }
      );
    }
    return NextResponse.json({ photos: await searchPhotos(provider, key, query, ratio) });
  } catch (err) {
    if (err instanceof PhotoError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "사진 처리 중 오류가 발생했습니다. 잠시 뒤 다시 시도해주세요." }, { status: 502 });
  }
}
