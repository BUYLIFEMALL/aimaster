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

// 병합 A-3(v2.17 후보, 올인원 → 에이전트): 방문 정보·근거 있는 FAQ. 모두 선택 항목이라 예전 결과도 그대로 열린다.
export const VISIT_KINDS = ["맛집", "카페", "여행", "체험", "기타"] as const;
export const visitInfoSchema = z.object({
  kind: z.enum(VISIT_KINDS).optional(),
  region: z.string().trim().min(1).max(60).optional(),
  visitDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  companion: z.string().trim().min(1).max(40).optional(),
  oneLine: z.string().trim().min(1).max(120).optional(),
});
export type VisitInfo = z.infer<typeof visitInfoSchema>;
export const hasVisitInfo = (visit?: VisitInfo) => Boolean(visit && (visit.kind || visit.region || visit.visitDate || visit.companion || visit.oneLine));
/** 화면 입력에서 빈 칸을 빼고 방문 정보를 만든다(모두 비면 undefined). */
export function cleanVisitInfo(raw: { kind?: string; region?: string; visitDate?: string; companion?: string; oneLine?: string }): VisitInfo | undefined {
  const visit: VisitInfo = {};
  if ((VISIT_KINDS as readonly string[]).includes(raw.kind || "")) visit.kind = raw.kind as VisitInfo["kind"];
  for (const key of ["region", "visitDate", "companion", "oneLine"] as const) { const value = (raw[key] || "").trim(); if (value) visit[key] = value; }
  return hasVisitInfo(visit) ? visit : undefined;
}

export const photoReviewInputSchema = z.object({
  engine: z.object({ provider: z.enum(["openai", "anthropic", "gemini"]), model: z.string().max(100) }),
  place: z.string().trim().min(1).max(120),
  visitNotes: z.string().trim().max(4000),
  visit: visitInfoSchema.optional(),
  includeFaq: z.boolean().optional(),
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
export const photoReviewResultSchema = photoDraftSchema.extend({
  ...observationsSchema.shape,
  place: z.string().trim().min(1).max(120), visitNotes: z.string().trim().max(4000),
  visit: visitInfoSchema.optional(), includeFaq: z.boolean().optional(),
  photos: photoReviewInputSchema.shape.photos, coverId: z.string().uuid(),
  engine: photoReviewInputSchema.shape.engine, warning: z.string().max(500),
}).superRefine((value, ctx) => {
  const ids = value.photos.map(photo => photo.id);
  if (new Set(ids).size !== ids.length || new Set(value.photos.map(photo => photo.storagePath)).size !== ids.length
    || !ids.includes(value.coverId) || value.observations.length !== ids.length
    || value.observations.some((item, index) => item.id !== ids[index])
    || value.paragraphs.some(item => item.evidence.some(id => id !== "member-notes" && !ids.includes(id)))) {
    ctx.addIssue({ code: "custom", message: "사진과 근거의 연결을 확인해 주세요." });
  }
});
export type PhotoReviewResult = z.infer<typeof photoReviewResultSchema>;

/** 화면 입력의 동일성만 비교한다. 사진 바이트/서명 주소/키는 포함하지 않는다. */
export const photoReviewRevision = (input: PhotoReviewInput) => JSON.stringify(input);
export function photoReviewPlainText(result: PhotoReviewResult) {
  return `${result.title}\n\n${result.paragraphs.map(item => item.text).join("\n\n")}\n\n[직접 확인할 내용]\n${[result.warning, ...result.confirm].map(item => `- ${item}`).join("\n")}`;
}
