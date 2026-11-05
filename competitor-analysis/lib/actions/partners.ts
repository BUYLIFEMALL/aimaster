"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { searchChannels, NaverSearchError, type ChannelType } from "@/lib/naver/search";
import { PARTNER_NOTICE_VERSION } from "@/lib/partners/notice";

// 제휴 타깃 찾기(v1.10 초안). 회원 본인 네이버 검색 키로 공식 검색 API만 부른다(페이지를 긁지 않음).
// 연락처는 회원이 그 채널의 공개 페이지에서 직접 확인해 적는 값만 저장한다(마케팅 예외 지침 §4).

const TYPES: ChannelType[] = ["blog", "local", "cafe", "shop"];

export interface PartnerActionState { error?: string; added?: number; skipped?: number; needsKey?: boolean }

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
  for (const type of types) {
    let hits;
    try {
      hits = await searchChannels({ clientId, clientSecret }, type, keyword, 50);
    } catch (e) {
      return { error: e instanceof NaverSearchError ? e.message : "검색 중 문제가 생겼습니다.", added, skipped };
    }
    if (hits.length === 0) continue;
    const { data, error } = await supabase
      .from("competitor_partner_channels")
      .upsert(hits.map((h) => ({ ...h, user_id: user.id, keyword })), { onConflict: "user_id,channel_type,name,url", ignoreDuplicates: true })
      .select("id");
    if (error) return { error: "결과를 저장하지 못했습니다.", added, skipped };
    added += data?.length ?? 0;
    skipped += hits.length - (data?.length ?? 0);
  }

  revalidatePath("/partners");
  return { added, skipped };
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
