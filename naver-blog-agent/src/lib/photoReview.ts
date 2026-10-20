import { z } from "zod";
import { MAX_REVIEW_PHOTOS } from "./privatePhotoRules";

// 공식 사진 입력 지원을 확인한 기존 선택 항목만 연다. 다른 모델로 자동 교체하지 않는다.
export const PHOTO_REVIEW_MODELS: Record<string, readonly string[]> = {
  openai: ["gpt-4.1", "gpt-4o", "gpt-4o-mini", "gpt-6-astra"],
  anthropic: ["claude-haiku-4-5"],
  gemini: ["gemini-3.1-pro-preview"],
};
export const MAX_REVIEW_TOTAL_BYTES = 12 * 1024 * 1024;
export const PHOTO_REVIEW_WARNING = "사진 관찰은 AI 해석이며 사실 확인이 아닙니다. 맛·가격·방문일·직접 경험은 본인 메모와 원본을 대조해 검수해 주세요.";
export const supportsPhotoReview = (provider: string, model: string) => PHOTO_REVIEW_MODELS[provider]?.includes(model) === true;

export const photoReviewInputSchema = z.object({
  engine: z.object({ provider: z.enum(["openai", "anthropic", "gemini"]), model: z.string().max(100) }),
  place: z.string().trim().min(1).max(120),
  visitNotes: z.string().trim().max(4000),
  preferredTone: z.enum(["해요체", "합니다체", "친근한 반말", "한다체"]),
  targetLength: z.number().int().min(500).max(2500),
  coverId: z.string().uuid(),
  photos: z.array(z.object({ id: z.string().uuid(), storagePath: z.string().max(160), caption: z.string().trim().max(500) })).min(1).max(MAX_REVIEW_PHOTOS),
}).superRefine((value, ctx) => {
  if (!supportsPhotoReview(value.engine.provider, value.engine.model)) ctx.addIssue({ code: "custom", message: "선택 모델의 사진 입력을 확인하지 못했습니다. 사진 입력 지원 모델을 직접 선택해 주세요." });
  if (new Set(value.photos.map(photo => photo.id)).size !== value.photos.length || new Set(value.photos.map(photo => photo.storagePath)).size !== value.photos.length) ctx.addIssue({ code: "custom", message: "중복된 사진은 사용할 수 없습니다." });
  if (!value.photos.some(photo => photo.id === value.coverId)) ctx.addIssue({ code: "custom", message: "대표 사진을 확인해 주세요." });
});
export type PhotoReviewInput = z.infer<typeof photoReviewInputSchema>;

export const observationsSchema = z.object({ observations: z.array(z.object({
  id: z.string().uuid(), visible: z.string().trim().min(1).max(1000),
  uncertain: z.array(z.string().trim().min(1).max(250)).max(8),
})).min(1).max(MAX_REVIEW_PHOTOS) });
export const photoDraftSchema = z.object({
  title: z.string().trim().min(1).max(150),
  paragraphs: z.array(z.object({ text: z.string().trim().min(1).max(1500), evidence: z.array(z.string().max(100)).min(1).max(7) })).min(1).max(8),
  confirm: z.array(z.string().trim().min(1).max(300)).max(10),
});
export type PhotoReviewResult = z.infer<typeof photoDraftSchema> & z.infer<typeof observationsSchema> & {
  place: string; visitNotes: string;
  photos: PhotoReviewInput["photos"]; coverId: string;
  engine: PhotoReviewInput["engine"]; warning: string;
};

/** 화면 입력의 동일성만 비교한다. 사진 바이트/서명 주소/키는 포함하지 않는다. */
export const photoReviewRevision = (input: PhotoReviewInput) => JSON.stringify(input);
export function photoReviewPlainText(result: PhotoReviewResult) {
  return `${result.title}\n\n${result.paragraphs.map(item => item.text).join("\n\n")}\n\n[직접 확인할 내용]\n${[result.warning, ...result.confirm].map(item => `- ${item}`).join("\n")}`;
}
