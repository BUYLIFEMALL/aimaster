import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sniffImage } from "@/lib/we/imageSniff";
import { IMAGE_BUCKET, LIMITS } from "@/lib/we/types";

// 문서에 넣는 이미지: 공개 버킷 + 추측 불가능한 UUID 파일명(<uid>/<uuid>.<ext>).
// 공개 주소여야 .html 내보내기·서식 복사(블로그 붙여넣기)에서도 이미지가 깨지지 않는다. 업로드·삭제는 서버만 한다.
// 캐시는 1시간만 둔다: 파일을 지워도 CDN에 캐시된 주소는 캐시 기간 동안 응답하므로(실측), 삭제가 오래 지연되지 않게 짧게 한다.

export type StoreResult = { ok: true; url: string; path: string } | { ok: false; error: string; status: number };

export async function storeImage(userId: string, bytes: Uint8Array): Promise<StoreResult> {
  if (bytes.length === 0) return { ok: false, error: "빈 파일입니다.", status: 400 };
  if (bytes.length > LIMITS.imageBytes) return { ok: false, error: "이미지가 너무 큽니다(4MB 이하).", status: 413 };
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: "PNG·JPEG·WebP·GIF 이미지만 올릴 수 있습니다.", status: 415 };

  const admin = createAdminClient();
  const { data: existing } = await admin.storage.from(IMAGE_BUCKET).list(userId, { limit: LIMITS.images + 1 });
  if ((existing?.length ?? 0) >= LIMITS.images) {
    return { ok: false, error: `이미지는 최대 ${LIMITS.images}개까지 올릴 수 있습니다. 쓰지 않는 문서를 삭제하면 이미지도 함께 정리됩니다.`, status: 409 };
  }
  const path = `${userId}/${randomUUID()}.${kind.ext}`;
  const { error } = await admin.storage.from(IMAGE_BUCKET).upload(path, bytes, { contentType: kind.mime, upsert: false, cacheControl: "3600" });
  if (error) return { ok: false, error: "이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", status: 500 };
  const url = admin.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  return { ok: true, url, path };
}

/** 본인 폴더의 파일만 지운다(경로 접두사 검사) */
export async function removeImages(userId: string, paths: string[]): Promise<void> {
  const own = paths.filter((p) => p.startsWith(`${userId}/`) && !p.includes(".."));
  if (own.length === 0) return;
  await createAdminClient().storage.from(IMAGE_BUCKET).remove(own);
}
