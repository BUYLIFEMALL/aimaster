import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export const jobFormSchema = z.object({
  url: z.string().trim().min(1, "수집할 페이지의 URL을 입력해주세요.").url("올바른 URL 형식이 아닙니다."),
  targetFields: z
    .string()
    .trim()
    .min(1, "수집할 항목을 1개 이상 입력해주세요."),
  aiProvider: z.enum(["openai", "anthropic", "gemini", "perplexity"], {
    message: "AI 제공자를 선택해주세요.",
  }),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

/** "상품명, 가격, 평점" 형태의 콤마 구분 문자열을 정리된 배열로 변환한다. */
export function parseTargetFields(raw: string): string[] {
  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}
