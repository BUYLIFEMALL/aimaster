// AI 비서 플랫폼별 기본 모델(2026-11-14 주인님 「플랫폼별 모델을 선택할 수 있게」 「다른 자동화에 구현되어 있는 기능」).
// 기준: naver-blog-agent 「기본 모델 설정」·free-music-studio AiModelsCard(플랫폼마다 모델 저장, 키 없는 플랫폼은 「API 미등록」).
// 저장: 워크스페이스 회원 설정(user_settings.settings.aww_ai_models = {"anthropic":"…","openai":"…","gemini":"…"}).
// 쓰임: AI 비서가 「자동」일 때 그 플랫폼의 기본 모델(models.ts syncModels). 채팅에서 모델을 직접 고르면 그것이 우선.
import "server-only";
import { ApiError, type Ctx } from "@/litpage/server/api/handlers.ts";
import { getRecord, putRecord } from "@/litpage/server/db.ts";
import type { UserSettingsRecord } from "#shared/records.ts";
import { availableProviders } from "@/litpage/server/ai/providers/config.ts";
import { providerModelOptions } from "@/litpage/server/ai/models.ts";
import { warmModelLists } from "@/litpage/server/ai/models.ts";
import { forgetMemberAiKeys } from "./memberAiKeys";

export const AI_MODEL_PREFS_KEY = "aww_ai_models";
const PROVIDERS = ["anthropic", "openai", "gemini"] as const;
type P = (typeof PROVIDERS)[number];
const NAMES: Record<P, string> = { anthropic: "Claude (Anthropic)", openai: "OpenAI (GPT)", gemini: "Google Gemini" };

const clean = (v: unknown): Partial<Record<P, string>> => {
  const raw = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  const out: Partial<Record<P, string>> = {};
  for (const p of PROVIDERS) {
    const m = typeof raw[p] === "string" ? (raw[p] as string).trim() : "";
    if (m && m.length <= 100 && /^[A-Za-z0-9._:\-/]+$/.test(m)) out[p] = m;
  }
  return out;
};

export function readAiModelPrefs(userId: string): Partial<Record<P, string>> {
  const settings = getRecord<UserSettingsRecord>("user_settings", userId);
  const raw = (settings?.settings as Record<string, unknown> | undefined)?.[AI_MODEL_PREFS_KEY];
  if (typeof raw !== "string" || !raw) return {};
  try {
    return clean(JSON.parse(raw));
  } catch {
    return {};
  }
}

export const aiModelPrefHandlers: Record<string, (ctx: Ctx, body: any) => unknown> = {
  /** 플랫폼마다: 키 등록 여부 · 고를 수 있는 모델 · 원래 기본값 · 지금 고른 모델 */
  async awwAiModelPrefs(ctx) {
    if (!ctx.userId) throw new ApiError("Unauthorized", 401);
    await warmModelLists().catch(() => {});
    const have = new Set(availableProviders());
    const saved = readAiModelPrefs(ctx.userId);
    return {
      providers: PROVIDERS.map((p) => {
        if (!have.has(p)) return { id: p, name: NAMES[p], registered: false, options: [], def: "", selected: saved[p] ?? "" };
        const o = providerModelOptions(p);
        return { id: p, name: NAMES[p], registered: true, options: o.options, def: o.def, selected: saved[p] && o.options.some((x) => x.id === saved[p]) ? saved[p] : "" };
      }),
    };
  },
  /** 저장({ models: { anthropic?: id, openai?: id, gemini?: id } }) — 빈 값이면 원래 기본값으로 */
  awwSaveAiModelPrefs(ctx, body) {
    if (!ctx.userId) throw new ApiError("Unauthorized", 401);
    const settings = getRecord<UserSettingsRecord>("user_settings", ctx.userId);
    if (!settings) throw new ApiError("회원 설정을 찾지 못했습니다. 워크스페이스를 한 번 연 뒤 다시 시도해 주세요.", 400);
    const models = clean(body?.models);
    putRecord("user_settings", { ...settings, version: (settings.version ?? 0) + 1, settings: { ...settings.settings, [AI_MODEL_PREFS_KEY]: JSON.stringify(models) } } as UserSettingsRecord);
    forgetMemberAiKeys(ctx.userId); // 다음 요청부터 바로 반영
    return { models };
  },
};
