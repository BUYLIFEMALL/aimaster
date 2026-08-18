import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { ReservationCreateForm } from "@/components/reservations/ReservationCreateForm";
import { ReservationRow, type ReservationData } from "@/components/reservations/ReservationRow";
import { ReminderRulesSection, type ReminderRuleData } from "@/components/reservations/ReminderRulesSection";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function ReservationsPage() {
  const user = await requireProgramAccess();
  const supabase = await createClient();

  const [{ data: reservations }, { data: rules }] = await Promise.all([
    supabase
      .from("booking_reservations")
      .select("id, customer_name, customer_phone, customer_email, reservation_at, memo, status")
      .eq("user_id", user.id)
      .order("reservation_at", { ascending: true }),
    supabase
      .from("booking_reminder_rules")
      .select(
        "id, name, offset_minutes, channel_email, channel_sms, channel_alimtalk, channel_friendtalk, message_subject, message_text, kakao_template_id, kakao_variables, is_active",
      )
      .eq("user_id", user.id)
      .order("offset_minutes", { ascending: true }),
  ]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 mb-2">예약 관리</h1>
        <p className="text-sm text-gray-500">
          예약을 등록하고, 아래 "리마인드 규칙"에서 언제 어떤 채널로 알림을 보낼지 정하세요.
          15분마다 조건에 맞는 예약을 찾아 자동 발송합니다.
        </p>
      </div>

      <ReservationCreateForm />

      <ReminderRulesSection rules={(rules ?? []) as ReminderRuleData[]} />

      <div className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">예약 목록</h2>
        {(reservations ?? []).map((reservation: ReservationData) => (
          <ReservationRow key={reservation.id} reservation={reservation} />
        ))}
        {(reservations ?? []).length === 0 && (
          <p className="text-center text-sm text-gray-400 py-8">아직 등록된 예약이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
