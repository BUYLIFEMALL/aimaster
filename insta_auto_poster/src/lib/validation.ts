import { z } from "zod";

// 슬라이드(이미지)는 postFormSchema가 아니라 액션 안에서 JSON.parse 후 별도 검증한다
// (FormData는 배열/객체를 그대로 못 담으므로 slidesJson 문자열로 전달받는다).
export const postFormSchema = z
  .object({
    postType: z.enum(["feed", "card_news"]),
    // 인스타그램 캡션 실제 상한은 2200자. 피드는 450자 내외로 짧게 생성되지만,
    // 카드뉴스는 900~1400자짜리 매거진풍 캡션을 쓰므로 스키마 상한은 실제 플랫폼
    // 한도에 맞춘다 (짧은 캡션 규격 자체는 generator.ts의 프롬프트가 담당).
    caption: z
      .string()
      .trim()
      .min(1, "캡션을 입력해주세요.")
      .max(2200, "캡션은 2200자를 초과할 수 없습니다 (인스타그램 캡션 상한)."),
    hashtags: z.string().trim().optional().or(z.literal("")),
    // 새 글 작성 시에만 필수(액션에서 별도 검증), 수정 화면에서는 슬라이드를
    // 각자의 재생성/선택 액션으로 독립 관리하므로 비어 있어도 된다.
    slidesJson: z.string().trim().optional().or(z.literal("")),
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
