import { requireProgramAccess } from "@/lib/access";
import { InfluencerStudio } from "@/components/InfluencerStudio";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTINE_SCHEDULE_MODE } from "@/lib/routineSchedule";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireProgramAccess();

  // v1.21 「🗓 하루 일과 자동 예약」 켜고 끄기(src/lib/routineSchedule.ts) — admin이면 관리자에게만
  let routineScheduleEnabled = ROUTINE_SCHEDULE_MODE === "on";
  if (ROUTINE_SCHEDULE_MODE === "admin") {
    const { data: profile } = await createAdminClient().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    routineScheduleEnabled = Boolean(profile?.is_admin);
  }

  return <InfluencerStudio userEmail={user?.email} routineScheduleEnabled={routineScheduleEnabled} />;
}
