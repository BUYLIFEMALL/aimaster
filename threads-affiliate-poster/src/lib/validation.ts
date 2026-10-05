import { z } from "zod";

const mediaUrlStringSchema = z
  .string()
  .trim()
  .refine(
    (val) => {
      if (!val) return true;
      const urls = val.split(",").map((u) => u.trim()).filter(Boolean);
      return urls.every((u) => {
        try {
          const parsed = new URL(u);
          return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
          return false;
        }
      });
    },
    { message: "올바른 미디어 URL 형식이 아닙니다." }
  )
  .optional()
  .or(z.literal(""));

export const postFormSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "게시글 내용을 입력해주세요.")
      .max(500, "Threads 게시글은 500자를 초과할 수 없습니다."),
    imageUrl: mediaUrlStringSchema,
    videoUrl: mediaUrlStringSchema,
    publishMode: z.enum(["now", "schedule", "draft"]),
    scheduledAt: z.string().optional().or(z.literal("")),
    productId: z.string().uuid().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // 이미지와 영상의 총합 개수 검증 (최대 20개 허용)
    const imgCount = data.imageUrl ? data.imageUrl.split(",").map((u) => u.trim()).filter(Boolean).length : 0;
    const vidCount = data.videoUrl ? data.videoUrl.split(",").map((u) => u.trim()).filter(Boolean).length : 0;
    if (imgCount + vidCount > 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Threads 미디어(이미지+영상)는 최대 20개까지만 등록할 수 있습니다.",
        path: ["imageUrl"],
      });
    }

    if (data.publishMode === "schedule") {
      if (!data.scheduledAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "예약 게시 시각을 선택해주세요.",
          path: ["scheduledAt"],
        });
        return;
      }
      const scheduledDate = new Date(data.scheduledAt);
      if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "예약 시각은 현재보다 이후여야 합니다.",
          path: ["scheduledAt"],
        });
      }
    }
  });

export type PostFormValues = z.infer<typeof postFormSchema>;

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});
