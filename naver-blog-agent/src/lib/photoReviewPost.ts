import type { PipelineResult } from "./ai/pipeline";
import { PHOTO_REVIEW_WARNING, photoReviewResultSchema, type PhotoReviewResult } from "./photoReview";
import { placePlannedImages, type DraftImage } from "./draftImages";

/** 사진 목록의 순서를 유지한다. 표지는 type으로만 구분한다. URL은 만들지 않는다. */
export function photoReviewPost(review: PhotoReviewResult, category: string): PipelineResult {
  const images: DraftImage[] = review.photos.map((photo, index) => ({
    id: photo.id, storagePath: photo.storagePath, type: photo.id === review.coverId ? "thumbnail" : "body",
    caption: `사진 ${index + 1}${photo.caption ? ` · ${photo.caption}` : ""}`, prompt: "",
  }));
  return { title: review.title, content: placePlannedImages(review.paragraphs.map(item => item.text).join("\n\n"), images),
    tags: [], category, images, photoReview: { ...review, warning: PHOTO_REVIEW_WARNING },
    stepsLog: [{ step: "사진 후기", status: "warn", message: "사진 관찰·회원 메모 기반 초안입니다. 직접 검수 후 전송하세요." }] };
}

export function readPhotoReview(value: unknown): PhotoReviewResult | undefined {
  const parsed = photoReviewResultSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
