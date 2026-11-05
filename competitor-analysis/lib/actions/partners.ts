"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchChannels, NaverSearchError, type ChannelType } from "@/lib/naver/search";
import { PARTNER_NOTICE_VERSION } from "@/lib/partners/notice";
import { DEFAULT_MIN_SCORE, parseTerms, scoreChannel } from "@/lib/partners/match";
import { suggestTerms, type Suggestions } from "@/lib/partners/suggest";

// 제휴 타깃 찾기(v1.10 초안). 회원 본인 네이버 검색 키로 공식 검색 API만 부른다(페이지를 긁지 않음).
// 연락처는 회원이 그 채널의 공개 페이지에서 직접 확인해 적는 값만 저장한다(마케팅 예외 지침 §4).

const TYPES: ChannelType[] = ["blog", "local", "cafe", "shop"];

export interface PartnerActionState { error?: string; added?: number; skipped?: number; unmatched?: number; needsKey?: boolean }

export async function agreePartnerNoticeAction(): Promise<PartnerActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase
    .from("competitor_partner_consents")
    .upsert({ user_id: user.id, notice_version: PARTNER_NOTICE_VERSION, agreed_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) return { error: "동의를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." };
  revalidatePath("/partners");
  return {};
}

export async function searchPartnersAction(formData: FormData): Promise<PartnerActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { data: consent } = await supabase
    .from("competitor_partner_consents")
    .select("notice_version")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!consent || consent.notice_version < PARTNER_NOTICE_VERSION) return { error: "먼저 위의 안내를 읽고 동의해 주세요." };

  const keyword = String(formData.get("keyword") ?? "").trim().slice(0, 60);
  if (!keyword) return { error: "찾을 키워드를 입력해 주세요(예: 공동구매)." };
  const { main, extras } = parseTerms(keyword, String(formData.get("extra_terms") ?? ""));
  const minScoreRaw = Number(formData.get("min_score") ?? DEFAULT_MIN_SCORE);
  const minScore = Number.isFinite(minScoreRaw) ? Math.min(100, Math.max(0, Math.round(minScoreRaw))) : DEFAULT_MIN_SCORE;
  const types = TYPES.filter((t) => formData.get(`type_${t}`) === "on");
  if (types.length === 0) return { error: "찾을 채널 종류를 하나 이상 골라 주세요." };

  const [clientId, clientSecret] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
  ]);
  if (!clientId || !clientSecret) {
    return { needsKey: true, error: "네이버 검색 API 키가 없습니다. 설정(🔑 API키등록·플랫폼연동)에서 본인 Client ID·Secret을 등록해 주세요." };
  }

  let added = 0;
  let skipped = 0;
  let unmatched = 0;
  for (const type of types) {
    let hits;
    try {
      hits = await searchChannels({ clientId, clientSecret }, type, keyword, 50);
    } catch (e) {
      return { error: e instanceof NaverSearchError ? e.message : "검색 중 문제가 생겼습니다.", added, skipped, unmatched };
    }
    // 주제 매칭 판정: 기준 점수 미만은 저장하지 않는다(맞지 않는 채널은 의미 없음).
    const matched = hits
      .map((h) => ({ h, m: scoreChannel({ name: h.name, category: h.category, texts: h.texts, hitCount: h.hit_count }, main, extras) }))
      .filter(({ m }) => m.score >= minScore);
    unmatched += hits.length - matched.length;
    if (matched.length === 0) continue;
    const rows = matched.map(({ h, m }) => ({
      user_id: user.id, keyword, channel_type: h.channel_type, name: h.name, url: h.url,
      summary: h.summary, category: h.category, address: h.address,
      match_score: m.score, match_reasons: m.reasons.join(" · ").slice(0, 300),
    }));
    const { data, error } = await supabase
      .from("competitor_partner_channels")
      .upsert(rows, { onConflict: "user_id,channel_type,name,url", ignoreDuplicates: true })
      .select("id");
    if (error) return { error: "결과를 저장하지 못했습니다.", added, skipped, unmatched };
    added += data?.length ?? 0;
    skipped += rows.length - (data?.length ?? 0);
  }

  revalidatePath("/partners");
  return { added, skipped, unmatched };
}

const PHONE = /^[0-9+()\-\s]{7,40}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** 회원이 공개 페이지에서 직접 확인한 연락처를 적는다(서버가 찾지 않음). 빈 칸은 지운다. */
export async function saveContactAction(formData: FormData): Promise<PartnerActionState> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const phone = String(formData.get("public_phone") ?? "").trim();
  const email = String(formData.get("public_email") ?? "").trim();
  const note = String(formData.get("contact_note") ?? "").trim().slice(0, 300);
  if (!id) return { error: "대상을 다시 골라 주세요." };
  if (phone && !PHONE.test(phone)) return { error: "전화번호 형식을 확인해 주세요." };
  if (email && (!EMAIL.test(email) || email.length > 200)) return { error: "이메일 형식을 확인해 주세요." };

  const { error } = await supabase
    .from("competitor_partner_channels")
    .update({ public_phone: phone || null, public_email: email || null, contact_note: note || null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: "저장하지 못했습니다." };
  revalidatePath("/partners");
  return {};
}

export async function deletePartnerAction(formData: FormData) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (id) await supabase.from("competitor_partner_channels").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/partners");
}

/** 키워드 추천: 메인·연관(자동완성)·많이 검색하는 키워드(검색광고, 선택)·카테고리(업체·쇼핑 분류). 아무것도 저장하지 않는다. */
export async function suggestPartnerTermsAction(keywordInput: string): Promise<{ error?: string; data?: Suggestions }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const keyword = String(keywordInput ?? "").trim().slice(0, 60);
  if (!keyword) return { error: "추천받을 주제를 먼저 입력하거나 아래 추천 주제를 눌러 주세요." };
  const [clientId, clientSecret, adsKey, adsSecret, adsCustomer] = await Promise.all([
    resolveApiKey(supabase, user.id, "naver_client_id"),
    resolveApiKey(supabase, user.id, "naver_client_secret"),
    resolveApiKey(supabase, user.id, "naver_ads_api_key"),
    resolveApiKey(supabase, user.id, "naver_ads_secret_key"),
    resolveApiKey(supabase, user.id, "naver_ads_customer_id"),
  ]);
  const search = clientId && clientSecret ? { clientId, clientSecret } : null;
  const ads = adsKey && adsSecret && adsCustomer ? { apiKey: adsKey, secretKey: adsSecret, customerId: adsCustomer } : null;
  return { data: await suggestTerms(keyword, search, ads) };
}
