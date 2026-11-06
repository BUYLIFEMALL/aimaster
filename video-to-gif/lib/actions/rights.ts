"use server";

import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { logFileName } from "@/lib/eraseRegion";

export type RightsLogResult = { ok: true } | { ok: false; error: string };

/**
 * V5 「내 영상 일부 지우기」 실행 기록(2026-11-06): 권리 체크 뒤 실행할 때마다 파일 이름·시각을 회원 본인 기록으로 남긴다.
 * 공용 표 own_content_rights_log(ai-video-studio 0006), 회원 세션으로 넣고 RLS가 본인·이 프로그램·erase 줄만 허용한다
 * (supabase/migrations/20261106_erase_rights_log_v1_26.sql). 30일 뒤 ai-video-studio 정리 작업이 지운다.
 * 기록에 실패하면 지우기를 시작하지 않는다(영상 자체는 서버로 보내지 않음).
 */
export async function logEraseRun(fileName: string): Promise<RightsLogResult> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { error } = await supabase.from("own_content_rights_log").insert({
    user_id: user.id,
    program: "video-to-gif",
    tool: "erase",
    file_name: logFileName(String(fileName ?? "")),
  });
  if (error) return { ok: false, error: "실행 기록을 남기지 못해 시작하지 않았습니다. 잠시 뒤 다시 눌러 주세요." };
  return { ok: true };
}
