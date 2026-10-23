"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchProducts as searchAliexpress, type AliexpressProduct } from "@/lib/aliexpress/client";
import { searchProducts as searchDomeggook, type DomeggookProduct } from "@/lib/domeggook/client";
import { searchProducts as searchElevenst, type ElevenstProduct } from "@/lib/elevenst/client";
import { translateToEnglishKeyword, containsKorean } from "@/lib/ai/translateKeyword";

export interface FindSourcingCandidatesState {
  error?: string;
  products?: AliexpressProduct[];
  /** 한글 키워드를 영어로 번역해서 검색한 경우, 실제로 검색에 쓰인 영어 키워드 */
  translatedKeyword?: string;
  /** 한글 키워드인데 AI 키가 없어 번역을 못 하고 그대로 검색한 경우의 안내 문구 */
  warning?: string;
}

/**
 * 키워드로 알리익스프레스 소싱 후보(원가 비교용)를 찾는다. 결과는 저장하지 않는다.
 * 알리익스프레스 keywords 파라미터는 한글을 사실상 무시하고 무관한 인기상품을 반환하는
 * 것이 실계정으로 확인돼(2026-09-01), 한글 키워드는 검색 전에 영어로 번역한다.
 */
export async function findSourcingCandidatesAction(formData: FormData): Promise<FindSourcingCandidatesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드가 없습니다." };

  const [appKey, appSecret, trackingId, openaiKey, geminiKey] = await Promise.all([
    resolveApiKey(supabase, user.id, "aliexpress_app_key"),
    resolveApiKey(supabase, user.id, "aliexpress_app_secret"),
    resolveApiKey(supabase, user.id, "aliexpress_tracking_id"),
    resolveApiKey(supabase, user.id, "openai"),
    resolveApiKey(supabase, user.id, "gemini"),
  ]);

  if (!appKey || !appSecret || !trackingId) {
    return { error: "알리익스프레스 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  try {
    const { keyword: searchKeyword, translated } = await translateToEnglishKeyword(keyword, {
      openai: openaiKey,
      gemini: geminiKey,
    });
    const products = await searchAliexpress(searchKeyword, { appKey, appSecret, trackingId, pageSize: 10 });
    const warning =
      !translated && containsKorean(keyword)
        ? "한글 키워드를 영어로 자동 번역하지 못해 검색 결과가 부정확할 수 있습니다. 설정 페이지에서 OpenAI 또는 Gemini 키를 등록하면 자동 번역됩니다."
        : undefined;
    return { products, translatedKeyword: translated ? searchKeyword : undefined, warning };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "알리익스프레스 검색에 실패했습니다." };
  }
}

export interface FindDomeggookCandidatesState {
  error?: string;
  products?: DomeggookProduct[];
}

/** 키워드로 도매매(국내 위탁소싱) 후보를 찾는다. 결과는 저장하지 않는다. */
export async function findDomeggookCandidatesAction(formData: FormData): Promise<FindDomeggookCandidatesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드가 없습니다." };

  const apiKey = await resolveApiKey(supabase, user.id, "domeggook_api_key");
  if (!apiKey) {
    return { error: "도매매 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  try {
    const products = await searchDomeggook(keyword, { apiKey, pageSize: 20 });
    return { products };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "도매매 검색에 실패했습니다." };
  }
}

export interface FindElevenstCandidatesState {
  error?: string;
  products?: ElevenstProduct[];
}

/** 키워드로 11번가(국내 오픈마켓) 후보를 찾는다. 결과는 저장하지 않는다. */
export async function findElevenstCandidatesAction(formData: FormData): Promise<FindElevenstCandidatesState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const keyword = String(formData.get("keyword") ?? "").trim();
  if (!keyword) return { error: "키워드가 없습니다." };

  const apiKey = await resolveApiKey(supabase, user.id, "elevenst_api_key");
  if (!apiKey) {
    return { error: "11번가 API 키가 등록되어 있지 않습니다. 설정 페이지에서 본인 키를 등록해주세요." };
  }

  try {
    const products = await searchElevenst(keyword, { apiKey, pageSize: 30 });
    return { products };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "11번가 검색에 실패했습니다." };
  }
}
