import { z } from "zod";

export const postFormSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "게시글 내용을 입력해주세요.")
      .max(500, "Threads 게시글은 500자를 초과할 수 없습니다."),
    imageUrl: z
      .string()
      .trim()
      .url("올바른 이미지 URL 형식이 아닙니다.")
      .optional()
      .or(z.literal("")),
    videoFileName: z.string().trim().optional().or(z.literal("")),
    publishMode: z.enum(["now", "schedule", "draft"]),
    scheduledAt: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
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
