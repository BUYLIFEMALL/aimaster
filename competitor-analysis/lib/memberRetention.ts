import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRetentionExempt } from "@/lib/retentionExempt";
import { retentionCutoff } from "@/lib/retention";

// 30일 보관 예외 회원(profiles.retention_exempt — 관리자·시험 계정·저장 구독 연장 회원)은
// 30일 지난 자료도 숨기지 않는다(2026-11-13). 예외 회원이면 기준 시각을 1970년으로 돌려준다.
const NO_CUTOFF = new Date(0).toISOString();

/** 이 회원의 조회 기준 시각(이 시각보다 뒤에 만든 자료만 보임). 한 요청 안에서는 한 번만 읽는다. */
export const memberRetentionCutoff = cache(async (userId: string): Promise<string> =>
  (await isRetentionExempt(createAdminClient(), userId)) ? NO_CUTOFF : retentionCutoff());
