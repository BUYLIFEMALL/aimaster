import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { resolveApiKey } from "@/lib/apiKeys";
import { createAdminClient } from "@/lib/supabase/admin";
import { assertOwnedPhotoPath, MAX_PHOTO_BYTES, photoFormat, PrivatePhotoError, signPrivatePhotos } from "@/lib/privatePhotos";
import { MAX_REVIEW_TOTAL_BYTES, photoReviewInputSchema } from "@/lib/photoReview";
import { runPhotoReview } from "@/lib/ai/photoReviewPipeline";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function POST(req: Request) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  try {
    const access = await checkProgramAccessApi();
    if (!access.allowed) return reply({ error: access.error }, access.status);
    if (Number(req.headers.get("content-length")) > 64_000) return reply({ error: "사진 후기 입력이 너무 깁니다." }, 400);
    const raw = await req.text();
    if (raw.length > 20_000) return reply({ error: "사진 후기 입력이 너무 깁니다." }, 400);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return reply({ error: "사진 후기 입력을 확인해 주세요." }, 400); }
    const parsed = photoReviewInputSchema.safeParse(body);
    if (!parsed.success) return reply({ error: "장소·사진 1~6장·대표·메모·사진 입력 지원 모델을 확인해 주세요. 사진별 설명은 500자, 방문 메모는 4,000자까지입니다." }, 400);
    const input = parsed.data;
    for (const photo of input.photos) assertOwnedPhotoPath(photo.storagePath, access.userId!);
    const apiKey = await resolveApiKey(access.userId!, input.engine.provider);
    if (!apiKey) return reply({ error: "선택한 공급사의 본인 API 키를 [API키등록·플랫폼연동]에서 등록해 주세요. 다른 키로 대신하지 않습니다.", needKey: true }, 400);
    const signal = AbortSignal.any([req.signal, AbortSignal.timeout(220_000)]);
    signal.throwIfAborted();
    const admin = createAdminClient();
    const photos = await signPrivatePhotos(admin, access.userId!, input.photos.map(photo => photo.storagePath));
    const images = [];
    let total = 0;
    for (const photo of photos) {
      signal.throwIfAborted();
      // 사용자 주소를 받지 않는다. 서버가 소유권/만료를 검증해 발급한 주소만 읽는다.
      const response = await fetch(photo.preview.url, { signal: AbortSignal.any([signal, AbortSignal.timeout(20_000)]), cache: "no-store", redirect: "error" });
      if (!response.ok) throw new PrivatePhotoError("보관 중인 사진을 읽지 못했습니다. 사진 상태를 다시 확인해 주세요.", 503);
      const size = Number(response.headers.get("content-length"));
      if (size > MAX_PHOTO_BYTES || size + total > MAX_REVIEW_TOTAL_BYTES) throw new PrivatePhotoError("후기 사진은 장당 4MB, 합계 12MB 이하로 준비해 주세요.", 400);
      const bytes = new Uint8Array(await response.arrayBuffer());
      total += bytes.length;
      if (!bytes.length || bytes.length > MAX_PHOTO_BYTES || total > MAX_REVIEW_TOTAL_BYTES) throw new PrivatePhotoError("후기 사진은 장당 4MB, 합계 12MB 이하로 준비해 주세요.", 400);
      const mimeType = response.headers.get("content-type")?.split(";")[0].trim() || "";
      photoFormat(bytes, mimeType);
      if (Date.parse(photo.expiresAt) <= Date.now()) throw new PrivatePhotoError("보관 기간이 지난 사진입니다. 사진을 다시 확인해 주세요.", 410);
      images.push({ mimeType, base64: Buffer.from(bytes).toString("base64") });
    }
    signal.throwIfAborted();
    const result = await runPhotoReview(input, images, apiKey, signal);
    if (photos.some(photo => Date.parse(photo.expiresAt) <= Date.now())) throw new PrivatePhotoError("작성 중 사진의 보관 기간이 만료되었습니다. 원본 사진을 다시 확인해 주세요.", 410);
    return reply({ result, saved: false });
  } catch (error) {
    return reply({ error: error instanceof PrivatePhotoError ? error.message : error instanceof Error && !["AbortError", "TimeoutError", "TypeError"].includes(error.name) ? error.message : "사진 후기 처리를 끝까지 확인하지 못했습니다. 자동 재시도하지 않으므로 AI 사용량을 확인해 주세요." }, error instanceof PrivatePhotoError ? error.status : 503);
  }
}
