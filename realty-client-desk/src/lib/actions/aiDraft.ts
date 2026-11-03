"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { draftFactsText, draftListing } from "@/lib/ai/listingDraft";
import { aiEngine, resolveAiModel, toAiProvider } from "@/lib/ai/engines";
import { riskyPhrases } from "@/lib/desk/adCheck";

// 4단계(2026-11-03) → v1.08: 회원 본인 AI 키(공용 user_api_keys — openai·anthropic·gemini, 다른 프로그램에서 넣었으면 그대로 씀) 저장·삭제 + 매물 AI 초안.
// 키가 없으면 운영자·다른 회원 키로 대신하지 않는다(최상위 규칙). 초안 글은 저장하지 않고 화면에만 돌려준다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface KeyState {
  error?: string;
  success?: boolean;
}

export async function saveAiKeyAction(providerRaw: string, formData: FormData): Promise<KeyState> {
  const user = await requireProgramAccess();
  const engine = aiEngine(toAiProvider(providerRaw));
  const apiKey = String(formData.get("apiKey") ?? "").trim();
  if (!apiKey) return { error: "API 키를 넣어 주세요." };
  if (!engine.keyPattern.test(apiKey)) return { error: `${engine.keyHint} (저장하지 않았어요)` };
  const db = (await createClient()) as unknown as SupabaseLike;
  const { error } = await db.from("user_api_keys").upsert({ user_id: user.id, provider: engine.keyProvider, api_key: apiKey }, { onConflict: "user_id,provider" });
  if (error) return { error: error.message };
  revalidatePath("/settings");
  return { success: true };
}

export async function deleteAiKeyAction(providerRaw: string): Promise<void> {
  const user = await requireProgramAccess();
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from("user_api_keys").delete().eq("user_id", user.id).eq("provider", aiEngine(toAiProvider(providerRaw)).keyProvider);
  revalidatePath("/settings");
}

export interface DraftState {
  error?: string;
  needsKey?: boolean;
  ad?: string;
  sms?: string;
  risky?: string[];
  model?: string;
  engine?: string;
}

export async function draftListingAction(listingId: string, providerRaw: string, modelRaw: string): Promise<DraftState> {
  const user = await requireProgramAccess();
  const provider = toAiProvider(providerRaw);
  const engine = aiEngine(provider);
  const model = resolveAiModel(provider, modelRaw);
  const db = (await createClient()) as unknown as SupabaseLike;
  const { data: key } = await db.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", engine.keyProvider).maybeSingle();
  if (!key?.api_key) return { error: `${engine.name} API 키가 없어요. 「API키등록·플랫폼연동」에서 본인 키를 넣어 주세요.`, needsKey: true };
  // 두 번 누르기·여러 탭으로 겹쳐 부르지 않게, 1분 안에 요청한 적이 없을 때만 표시를 먼저 남기고 부른다(실거래 AI 총평과 같은 방식)
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: l } = await db.from("realty_desk_listings")
    .update({ ai_requested_at: new Date().toISOString() })
    .eq("id", listingId).eq("user_id", user.id)
    .or(`ai_requested_at.is.null,ai_requested_at.lt.${cutoff}`)
    .select("title, deal_type, property_type, address, price, monthly, area_m2, floor_info, rooms, baths, direction, move_in, parking, approval_date, mgmt_fee")
    .maybeSingle();
  if (!l) return { error: "방금 AI 초안을 요청했어요. 1분 뒤에 다시 눌러 주세요." };
  const { data: office } = await db.from("realty_desk_offices").select("office_name, office_phone, office_address, reg_no, broker_name").eq("user_id", user.id).maybeSingle();
  const won = (v: number | null) => (v === null ? null : v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만 원`);
  try {
    const { ad, sms } = await draftListing(provider, model, key.api_key, draftFactsText({
      매물이름: l.title, 거래: l.deal_type, 종류: l.property_type, 소재지: l.address, [l.deal_type === "매매" ? "매매가" : "보증금"]: won(l.price), 월세: won(l.monthly),
      전용면적: l.area_m2 ? `${l.area_m2}㎡` : null, 층: l.floor_info, 방: l.rooms, 욕실: l.baths, 방향: l.direction, 입주가능일: l.move_in, 주차: l.parking, 사용승인일: l.approval_date, 관리비: l.mgmt_fee,
    }, office ? { 명칭: office.office_name, 소재지: office.office_address, 연락처: office.office_phone, 등록번호: office.reg_no, 개업공인중개사: office.broker_name } : null));
    return { ad, sms, risky: riskyPhrases(`${ad}\n${sms}`), model, engine: engine.name };
  } catch (e) {
    return { error: `AI 초안을 받지 못했어요: ${e instanceof Error ? e.message : String(e)}` };
  }
}
