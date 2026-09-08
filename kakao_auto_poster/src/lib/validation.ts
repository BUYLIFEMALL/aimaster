import { z } from "zod";

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

// 데이터 조회 범위(회원이 직접 선택) 옵션. Perplexity 검색 프롬프트의 "최근 N일" 문구로
// 그대로 이어진다 (lib/ai/collector.ts의 formatLookbackLabel).
export const LOOKBACK_DAYS_OPTIONS = [
  { value: 3, label: "최근 3일" },
  { value: 7, label: "최근 1주" },
  { value: 14, label: "최근 2주 (기본)" },
  { value: 30, label: "최근 1개월" },
  { value: 90, label: "최근 3개월" },
] as const;

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
  lookbackDays: z.coerce.number().int().refine(
    (v) => LOOKBACK_DAYS_OPTIONS.some((o) => o.value === v),
    "조회 범위를 다시 선택해주세요.",
  ),
});
