import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

// 서비스(pipeline.py)의 절대 상한과 동일하게 맞춰둔다 — 이보다 큰 값을 보내도 서버에서
// 어차피 이 값으로 잘린다.
export const MAX_ROWS_CEILING = 2000;
export const DEFAULT_MAX_ROWS = 100;

export const jobFormSchema = z.object({
  url: z.string().trim().min(1, "수집할 페이지의 URL을 입력해주세요.").url("올바른 URL 형식이 아닙니다."),
  targetFields: z
    .string()
    .trim()
    .min(1, "수집할 항목을 1개 이상 입력해주세요."),
  aiModel: z.string().trim().min(1, "분석에 사용할 AI 모델을 선택해주세요."),
  maxRows: z.coerce
    .number({ message: "최대 수집 건수를 숫자로 입력해주세요." })
    .int("최대 수집 건수는 정수여야 합니다.")
    .min(1, "최대 수집 건수는 1건 이상이어야 합니다.")
    .max(MAX_ROWS_CEILING, `최대 수집 건수는 ${MAX_ROWS_CEILING}건을 넘을 수 없습니다.`),
});

export type JobFormValues = z.infer<typeof jobFormSchema>;

/** "상품명, 가격, 평점" 형태의 콤마 구분 문자열을 정리된 배열로 변환한다. */
export function parseTargetFields(raw: string): string[] {
  return raw
    .split(",")
    .map((field) => field.trim())
    .filter(Boolean);
}
