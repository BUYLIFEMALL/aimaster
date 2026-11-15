// 2026-11-15 AI 비서 「🔎 웹 검색 도구」 고르기(플랜 docs/PLAN_20261115_SEARCH_TOOL_CHOICE.md).
// 저장: 워크스페이스 회원 설정 user_settings.settings.aww_search_tool = "auto" | "builtin" | "naver" | …
// 키: 공용 user_api_keys(다른 프로그램에서 등록한 키 그대로) — 여기서는 등록 여부만 보여 준다(키 값은 돌려주지 않음).
import "server-only";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { getRecord, putRecord } from "@/litpage/server/db.ts";
import type { UserSettingsRecord } from "#shared/records.ts";
import { EXTERNAL_ORDER, SEARCH_CHOICES, SEARCH_LABEL, hasSearchKeys, isSearchChoice, type SearchChoice } from "@/litpage/server/ai/providers/webSearch.ts";
import { forgetMemberAiKeys, loadMemberAiKeys } from "./memberAiKeys";

export const SEARCH_PREF_KEY = "aww_search_tool";

export function readSearchChoice(userId: string): SearchChoice {
  const settings = getRecord<UserSettingsRecord>("user_settings", userId);
  const raw = (settings?.settings as Record<string, unknown> | undefined)?.[SEARCH_PREF_KEY];
  return isSearchChoice(raw) ? raw : "auto";
}

const NOTE: Record<SearchChoice, string> = {
  auto: "AI 모델이 가진 검색을 씁니다(Claude·OpenAI 내장, Gemini는 구글 검색). 회원 AI 키 요금.",
  builtin: "Claude·OpenAI 내장 검색, Gemini는 구글 검색(유료 등급 키 월 5,000회 무료 뒤 1,000회당 $14).",
  naver: "국내 웹문서에 강함 · 무료(하루 한도)",
  kakao: "다음 웹문서 · 무료(하루 한도)",
  tavily: "AI용 검색 · 요약 포함 · 무료 한도 뒤 사용량 과금",
  perplexity: "검색 + 답 요약 · 사용량 과금",
  serpapi: "구글 검색 결과 그대로 · 무료 한도 작음",
};

export const searchPrefHandlers: Record<string, (ctx: Ctx, body: any) => unknown> = {
  /** 선택지 목록(등록 여부 포함)과 지금 고른 것 */
  async awwSearchPrefs(ctx) {
    if (!ctx.userId) throw new ApiError("Unauthorized", 401);
    const keys = await loadMemberAiKeys(ctx.userId).catch(() => ({}) as Awaited<ReturnType<typeof loadMemberAiKeys>>);
    const sk = keys.search?.keys ?? {};
    const hasAi = !!(keys.anthropicKey || keys.openaiKey || keys.geminiKey);
    return {
      selected: readSearchChoice(ctx.userId),
      options: SEARCH_CHOICES.map((id) => ({
        id, label: SEARCH_LABEL[id], note: NOTE[id],
        ready: id === "auto" ? true : id === "builtin" ? hasAi : hasSearchKeys(sk, id),
      })),
      externalReady: EXTERNAL_ORDER.filter((s) => hasSearchKeys(sk, s)),
    };
  },
  /** 저장({ choice }) */
  awwSaveSearchPrefs(ctx, body) {
    if (!ctx.userId) throw new ApiError("Unauthorized", 401);
    if (!isSearchChoice(body?.choice)) throw new ApiError("검색 도구를 골라 주세요.", 400);
    const settings = getRecord<UserSettingsRecord>("user_settings", ctx.userId);
    if (!settings) throw new ApiError("회원 설정을 찾지 못했습니다. 워크스페이스를 한 번 연 뒤 다시 시도해 주세요.", 400);
    putRecord("user_settings", { ...settings, version: (settings.version ?? 0) + 1, settings: { ...settings.settings, [SEARCH_PREF_KEY]: body.choice } } as UserSettingsRecord);
    forgetMemberAiKeys(ctx.userId); // 바로 반영
    return { selected: body.choice };
  },
};
