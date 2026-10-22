"use server";

import { MOVED_MESSAGE } from "@/components/MovedNotice";

// 2026-10-23 병합 A(v1.11): 사용 종료 — 키워드 확장은 키워드·경쟁사 분석 자동화(competitor-analysis `lib/actions/expansion.ts`)로 옮겨졌다.
// 화면이 안내로 바뀌었어도 직접 호출되는 경우를 막기 위해 유료 호출(SerpApi·OpenAI) 없이 안내만 돌려준다.
export interface RunExpansionState {
  error?: string;
  needsApiKey?: string;
  runId?: string;
}

export async function runKeywordExpansionAction(_seedId: string): Promise<RunExpansionState> {
  return { error: MOVED_MESSAGE };
}
