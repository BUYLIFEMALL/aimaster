import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 결과물(GIF) 보관 기간 — 이 기간이 지나면 Storage 용량 절약을 위해 지운다.
const RESULT_RETENTION_DAYS = 7;
// 원본 업로드는 정상적으로는 변환 직후 워커가 바로 지운다. 이 시간이 지나도 input_key가
// 남아있으면 워커가 재시작 등으로 정리를 못 한 "고아 파일"로 보고 강제로 지운다.
const ORPHAN_UPLOAD_HOURS = 2;

function isAuthorized(request: NextRequest): boolean {
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  // 1) 고아 원본 정리 — input_key가 남아있는데 일정 시간이 지난 것들.
  const orphanCutoff = new Date(now.getTime() - ORPHAN_UPLOAD_HOURS * 60 * 60 * 1000).toISOString();
  const { data: orphanRows } = await supabase
    .from("videotogif_conversions")
    .select("job_id, input_key")
    .not("input_key", "is", null)
    .lt("created_at", orphanCutoff);

  let orphansRemoved = 0;
  for (const row of orphanRows ?? []) {
    if (!row.input_key) continue;
    await supabase.storage.from("videotogif-uploads").remove([row.input_key]).catch(() => {});
    await supabase.from("videotogif_conversions").update({ input_key: null }).eq("job_id", row.job_id);
    orphansRemoved += 1;
  }

  // 2) 오래된 결과물 정리 — 보관 기간이 지난 완료 작업의 GIF만 지우고, 작업 이력(행)은 남긴다.
  const resultCutoff = new Date(now.getTime() - RESULT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: expiredRows } = await supabase
    .from("videotogif_conversions")
    .select("job_id, output_key")
    .not("output_key", "is", null)
    .lt("completed_at", resultCutoff);

  let resultsRemoved = 0;
  for (const row of expiredRows ?? []) {
    if (!row.output_key) continue;
    await supabase.storage.from("videotogif-results").remove([row.output_key]).catch(() => {});
    await supabase.from("videotogif_conversions").update({ output_key: null }).eq("job_id", row.job_id);
    resultsRemoved += 1;
  }

  return NextResponse.json({ ok: true, orphansRemoved, resultsRemoved });
}
