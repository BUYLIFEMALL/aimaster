import { requireProgramAccess } from "@/lib/access";
import { InfluencerStudio } from "@/components/InfluencerStudio";
import { createAdminClient } from "@/lib/supabase/admin";
import { ROUTINE_SCHEDULE_MODE } from "@/lib/routineSchedule";
import { AIF_ASSETS_MODE, assetFlowEnabled } from "@/lib/assets/generation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await requireProgramAccess();

  // v1.21 「🗓 하루 일과 자동 예약」 켜고 끄기(src/lib/routineSchedule.ts) — admin이면 관리자에게만
  let routineScheduleEnabled = ROUTINE_SCHEDULE_MODE === "on";
  if (ROUTINE_SCHEDULE_MODE === "admin") {
    const { data: profile } = await createAdminClient().from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    routineScheduleEnabled = Boolean(profile?.is_admin);
  }

  // 자산 번호 흐름(W01-UII): 서버 상수 한 곳(AIF_ASSETS_MODE)이 정한다. 지금은 "off"라 false — 화면은 기존 흐름만 쓴다
  // 계정 경계(W01-UII): key는 서버가 확인한 세션 회원 id다(이메일 글자가 아니다). 회원이 바뀌면 화면 전체가 새로 만들어져
  // 앞 계정의 히스토리 목록·선택한 결과·설정·참고 사진이 즉시 비워진다. 한 계정으로 쓰는 동안에는 값이 같아 아무 일도 없다.
  return <InfluencerStudio key={user.id} userEmail={user?.email} routineScheduleEnabled={routineScheduleEnabled} assetFlow={assetFlowEnabled(AIF_ASSETS_MODE)} />;
}
