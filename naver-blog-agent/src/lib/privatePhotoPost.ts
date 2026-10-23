import "server-only";
import { PHOTO_REVIEW_WARNING, photoReviewResultSchema, type PhotoReviewResult } from "./photoReview";
import { PrivatePhotoError, signPrivatePhotos } from "./privatePhotos";
import { stableJson } from "./postReviewSnapshot";

/** 저장 직전에 실제 소유권/수명을 확인한다. 서명 URL은 검증에만 쓰고 버린다. */
export async function validatePrivatePhotoPost(admin: any, userId: string, payload: Record<string, any>, current: any) {
  const images = payload.images ?? current?.images ?? [];
  const privateImages = images.filter((image: any) => image && typeof image === "object" && image.storagePath !== undefined);
  const existingReview = current?.research_summary?.photo_review;
  if (current && payload.photo_review !== undefined && stableJson(payload.photo_review) !== stableJson(existingReview)) {
    throw new PrivatePhotoError("처음 저장한 사진 근거는 교체할 수 없습니다. 새 사진 후기로 작성해 주세요.", 409);
  }
  const rawReview = payload.photo_review ?? existingReview;
  if (!privateImages.length && !rawReview) return {};
  if (!privateImages.length || privateImages.length !== images.length || privateImages.length > 6
    || new Set(privateImages.map((image: any) => image.storagePath)).size !== privateImages.length
    || privateImages.filter((image: any) => image.type === "thumbnail").length !== 1
    || privateImages.some((image: any) => !["thumbnail", "body"].includes(image.type) || typeof image.caption !== "string" || image.caption.length > 550
      || image.url !== undefined || image.preview !== undefined || image.prompt)) {
    throw new PrivatePhotoError("사진 1~6장·대표 1장·정적 사진 경로를 확인해 주세요. 임시 주소는 저장할 수 없습니다.", 400);
  }
  const content = payload.content ?? current?.content ?? "";
  if (/<\/?(?:p|h[1-6]|img|div|ul|ol|table|blockquote)\b/i.test(content) || /(?:blob:|data:image\/|\/storage\/v1\/object\/sign\/)/i.test(content)
    || (content.match(/^\s*\[IMAGE INSERT\s*-\s*[^\]]*\]\s*$/gim) || []).length !== privateImages.filter((image: any) => image.type === "body").length) {
    throw new PrivatePhotoError("사진 원고는 원본 텍스트로 저장하고 본문 사진 위치 표시를 유지해 주세요. 임시 사진 주소는 본문에 넣을 수 없습니다.", 400);
  }
  let photoReview: PhotoReviewResult | undefined;
  if (rawReview !== undefined) {
    if (/(?:blob:|data:image\/|\/storage\/v1\/object\/sign\/)/i.test(JSON.stringify(rawReview))) throw new PrivatePhotoError("사진 근거에 임시 주소를 저장할 수 없습니다.", 400);
    const parsed = photoReviewResultSchema.safeParse(rawReview);
    if (!parsed.success) throw new PrivatePhotoError("사진 후기의 원본 근거를 확인해 주세요.", 400);
    const review = { ...parsed.data, warning: PHOTO_REVIEW_WARNING };
    photoReview = review;
    if (review.photos.length !== privateImages.length || privateImages.some((image: any, index: number) =>
      image.id !== review.photos[index].id || image.storagePath !== review.photos[index].storagePath
      || (image.type === "thumbnail") !== (image.id === review.coverId))) {
      throw new PrivatePhotoError("사진 후기의 순서·대표·근거 연결을 확인해 주세요.", 400);
    }
  }
  const photos = await signPrivatePhotos(admin, userId, privateImages.map((image: any) => image.storagePath));
  return { images: privateImages.map((image: any, index: number) => ({
    ...(image.id ? { id: image.id } : {}), storagePath: photos[index].storagePath,
    type: image.type, caption: image.caption, prompt: "", createdAt: photos[index].createdAt, expiresAt: photos[index].expiresAt,
  })), photoReview, createdAt: photos.reduce((oldest, photo) => photo.createdAt < oldest ? photo.createdAt : oldest, photos[0].createdAt) };
}
