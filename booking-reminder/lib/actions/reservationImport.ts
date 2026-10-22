"use server";

import { revalidatePath } from "next/cache";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { parseReservationWorkbook, type ParsedReservation, type SkippedRow } from "@/lib/reservationImport";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface ReservationImportState {
  error?: string;
  rows?: ParsedReservation[]; // 등록할(또는 등록한) 예약
  skipped?: SkippedRow[];
  tooMany?: boolean;
  imported?: number;
}

/**
 * 예약 엑셀 일괄 등록(v1.28). mode="preview"는 DB에 쓰지 않고 등록 가능/건너뜀만 돌려주고,
 * mode="import"는 같은 파일을 서버가 다시 읽어 검사한 뒤 등록한다(화면이 보낸 표를 믿지 않음).
 * 이미 지난 예약일시·이미 등록된 같은 예약(고객명+연락처+예약일시)은 건너뛴다. 발송은 하지 않는다 —
 * 등록된 예약은 기존 리마인드 규칙이 예약일시에 맞춰 보낸다.
 */
export async function reservationImportAction(formData: FormData): Promise<ReservationImportState> {
  const user = await requireProgramAccess();
  const mode = formData.get("mode") === "import" ? "import" : "preview";

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "엑셀 파일을 선택해 주세요." };
  if (file.size > MAX_FILE_BYTES) return { error: "파일이 너무 큽니다(최대 5MB)." };

  let parsed;
  try {
    parsed = parseReservationWorkbook(Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return { error: `엑셀 파일을 읽지 못했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}` };
  }
  const { rows, skipped, tooMany } = parsed;

  const supabase = await createClient();
  let fresh = rows;
  if (rows.length > 0) {
    const times = rows.map((r) => r.reservation_at).sort();
    const { data: existing } = await supabase
      .from("booking_reservations")
      .select("customer_name, customer_phone, customer_email, reservation_at")
      .eq("user_id", user.id)
      .gte("reservation_at", times[0])
      .lte("reservation_at", times[times.length - 1]);
    const key = (r: { customer_name: string; customer_phone: string | null; customer_email: string | null; reservation_at: string }) =>
      `${r.customer_name}|${r.customer_phone ?? r.customer_email}|${new Date(r.reservation_at).getTime()}`;
    const existingKeys = new Set((existing ?? []).map(key));
    fresh = rows.filter((r) => {
      if (!existingKeys.has(key(r))) return true;
      skipped.push({ row: r.row, reason: "이미 등록된 같은 예약" });
      return false;
    });
    skipped.sort((a, b) => a.row - b.row);
  }

  if (mode === "preview") return { rows: fresh, skipped, tooMany };
  if (fresh.length === 0) return { error: "등록할 예약이 없습니다.", skipped, tooMany };

  const { error } = await supabase.from("booking_reservations").insert(
    fresh.map((r) => ({
      user_id: user.id,
      customer_name: r.customer_name,
      customer_phone: r.customer_phone,
      customer_email: r.customer_email,
      reservation_at: r.reservation_at,
      memo: r.memo,
    })),
  );
  if (error) return { error: error.message };

  revalidatePath("/reservations");
  return { imported: fresh.length, rows: fresh, skipped, tooMany };
}
