import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

// 주제 등록 폼 검증. 키워드는 콤마로 구분해서 최대 10개까지 입력받는다
// (trending-product-finder의 trend_watchlist.keywords 상한 관례와 동일).
export const topicFormSchema = z.object({
  topicName: z.string().trim().min(1, "주제 이름을 입력해주세요.").max(50, "주제 이름은 50자 이내로 입력해주세요."),
  keywords: z
    .string()
    .trim()
    .min(1, "관련 키워드를 최소 1개 입력해주세요.")
    .transform((v) =>
      v
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
    )
    .refine((arr) => arr.length <= 10, "키워드는 최대 10개까지 등록할 수 있습니다."),
});
