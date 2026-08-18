"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import type { ReservationStatus } from "@/types/database.types";

export interface ReservationActionState {
  error?: string;
}

function toTimestamptz(dateLocal: string): string | null {
  // <input type="datetime-local"> 값(예: "2026-08-20T14:30")을 그대로 Date로 파싱하면
  // 브라우저/서버 로컬 타임존 기준으로 해석된다 — 이 앱은 국내 대상이라 문제 없다.
  const date = new Date(dateLocal);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

export async function createReservationAction(formData: FormData): Promise<ReservationActionState> {
  const user = await requireProgramAccess();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim() || null;
  const customerEmail = String(formData.get("customerEmail") ?? "").trim() || null;
  const reservationAtLocal = String(formData.get("reservationAt") ?? "");
  const memo = String(formData.get("memo") ?? "").trim() || null;

  if (!customerName) return { error: "고객명을 입력해주세요." };
  const reservationAt = toTimestamptz(reservationAtLocal);
  if (!reservationAt) return { error: "예약일시를 입력해주세요." };
  if (!customerPhone && !customerEmail) return { error: "연락처(문자/카카오용) 또는 이메일 중 하나는 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.from("booking_reservations").insert({
    user_id: user.id,
    customer_name: customerName,
    customer_phone: customerPhone,
    customer_email: customerEmail,
    reservation_at: reservationAt,
    memo,
  });

  if (error) return { error: error.message };

  revalidatePath("/reservations");
  return {};
}

export async function updateReservationStatusAction(
  reservationId: string,
  status: ReservationStatus,
): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("booking_reservations")
    .update({ status })
    .eq("id", reservationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/reservations");
  return {};
}

export async function deleteReservationAction(reservationId: string): Promise<{ error?: string }> {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const { error } = await supabase
    .from("booking_reservations")
    .delete()
    .eq("id", reservationId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/reservations");
  return {};
}
