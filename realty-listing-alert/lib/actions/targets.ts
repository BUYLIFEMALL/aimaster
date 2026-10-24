"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { MAX_TARGETS, TRADE_TYPES, optionalNumber, parseComplexNo } from "@/lib/targets";
import { REGION_MAX_OPTIONS, DEFAULT_REGION_MAX, regionNameOf } from "@/lib/regions";

export type TargetActionState = { error?: string; success?: string };

const TRADE_CODES: string[] = TRADE_TYPES.map((t) => t.code);

function readConditions(formData: FormData) {
  const tradeTypes = formData.getAll("tradeTypes").map(String).filter((c) => TRADE_CODES.includes(c));
  const priceMin = optionalNumber(formData.get("priceMin"));
  const priceMax = optionalNumber(formData.get("priceMax"));
  const areaMin = optionalNumber(formData.get("areaMin"));
  const areaMax = optionalNumber(formData.get("areaMax"));
  if ([priceMin, priceMax, areaMin, areaMax].includes(undefined)) return { error: "가격·면적은 0 이상의 숫자로 넣어 주세요." } as const;
  if (!tradeTypes.length) return { error: "거래 종류를 하나 이상 골라 주세요." } as const;
  if (priceMin != null && priceMax != null && priceMin > priceMax) return { error: "가격 범위의 최소가 최대보다 큽니다." } as const;
  if (areaMin != null && areaMax != null && areaMin > areaMax) return { error: "면적 범위의 최소가 최대보다 큽니다." } as const;
  return { trade_types: tradeTypes, price_min: priceMin, price_max: priceMax, area_min: areaMin, area_max: areaMax } as const;
}

// 감시 대상 추가 — 10개 상한은 여기와 DB 트리거 두 곳에서 막는다(화면에서도 버튼을 잠금).
export async function addTargetAction(_prev: TargetActionState, formData: FormData): Promise<TargetActionState> {
  const user = await requireProgramAccess();
  const complexNo = parseComplexNo(String(formData.get("complex") ?? ""));
  if (!complexNo) return { error: "네이버 부동산에서 아파트 이름을 눌러 연 뒤, 화면 맨 위 인터넷 주소(https://로 시작하는 글자)를 복사해 넣어 주세요. 더 쉬운 방법: 위 「🏠 네이버 부동산에서 단지 찾기」로 아파트를 열고 초록 「➕ 매물 알림에 추가」 버튼을 누르세요." };
  const name = String(formData.get("complexName") ?? "").trim().slice(0, 100) || null;
  const conditions = readConditions(formData);
  if ("error" in conditions) return { error: conditions.error };

  const supabase = await createClient();
  const { count } = await supabase.from("realty_alert_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_TARGETS) return { error: `감시 대상은 최대 ${MAX_TARGETS}개까지 등록할 수 있습니다.` };

  const { error } = await supabase.from("realty_alert_targets").insert({ user_id: user.id, complex_no: complexNo, complex_name: name, ...conditions });
  if (error) {
    if (error.code === "23505") return { error: "이미 감시 중인 단지입니다." };
    if (error.message.includes("최대")) return { error: `감시 대상은 최대 ${MAX_TARGETS}개까지 등록할 수 있습니다.` };
    return { error: `저장에 실패했습니다: ${error.message}` };
  }
  revalidatePath("/targets");
  revalidatePath("/dashboard");
  return { success: `단지 ${name ?? complexNo}을(를) 감시 대상에 추가했어요.` };
}

// 지역(동) 감시 대상 추가(2026-10-25) — 확장이 그 동에서 매물 많은 단지 상위 N곳만 읽는다. 지역 1개 = 대상 1개(10개 상한 그대로).
export async function addRegionTargetAction(_prev: TargetActionState, formData: FormData): Promise<TargetActionState> {
  const user = await requireProgramAccess();
  const cortarNo = String(formData.get("cortarNo") ?? "");
  const regionName = regionNameOf(cortarNo);
  if (!regionName) return { error: "시·도 → 시·군·구 → 읍·면·동을 차례로 골라 주세요." };
  const maxRaw = Number(formData.get("regionMax") ?? DEFAULT_REGION_MAX);
  const regionMax = (REGION_MAX_OPTIONS as readonly number[]).includes(maxRaw) ? maxRaw : DEFAULT_REGION_MAX;

  const supabase = await createClient();
  const { count } = await supabase.from("realty_alert_targets").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((count ?? 0) >= MAX_TARGETS) return { error: `감시 대상은 최대 ${MAX_TARGETS}개까지 등록할 수 있습니다.` };

  const { error } = await supabase.from("realty_alert_targets").insert({
    user_id: user.id,
    target_type: "region",
    complex_no: null,
    cortar_no: cortarNo,
    region_name: regionName,
    region_max_complexes: regionMax,
  });
  if (error) {
    if (error.code === "23505") return { error: "이미 감시 중인 지역입니다." };
    if (error.message.includes("최대")) return { error: `감시 대상은 최대 ${MAX_TARGETS}개까지 등록할 수 있습니다.` };
    return { error: `저장에 실패했습니다: ${error.message}` };
  }
  revalidatePath("/targets");
  revalidatePath("/dashboard");
  return { success: `🏙 ${regionName}(매물 많은 단지 ${regionMax}곳)을 감시 대상에 추가했어요.` };
}

export async function updateTargetAction(_prev: TargetActionState, formData: FormData): Promise<TargetActionState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const conditions = readConditions(formData);
  if ("error" in conditions) return { error: conditions.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("realty_alert_targets")
    .update({ ...conditions, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: `저장에 실패했습니다: ${error.message}` };
  revalidatePath("/targets");
  return { success: "조건을 저장했어요." };
}

export async function toggleTargetAction(id: string, enabled: boolean) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("realty_alert_targets").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/targets");
  revalidatePath("/dashboard");
}

export async function deleteTargetAction(id: string) {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  await supabase.from("realty_alert_targets").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/targets");
  revalidatePath("/dashboard");
}
