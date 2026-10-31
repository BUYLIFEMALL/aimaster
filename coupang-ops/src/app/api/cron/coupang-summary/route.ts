import { createHash } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { getWingKeysForJob } from "@/lib/data";
import { readTodayCounts } from "@/lib/coupang/todayRead";
import { deliver, loadTargets } from "@/lib/alerts/deliver";
import { cleanChannels, kstDate, summaryMessage } from "@/lib/coupang/summary";
import { checkProgramAccess } from "@/lib/programAccess";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// 회원 전용 아침 요약 주소. 회원 cron-job.org 작업이 하루 1번 부른다(회원 토큰 해시로 그 회원만 처리, 읽기만, 쿠팡 쓰기 없음).
// cron-job.org는 30초 안에 응답이 없으면 실패로 보므로 곧바로 응답하고 처리는 응답 뒤에 한다.
async function run(userId: string) {
  const admin = createAdminClient();
  const finish = (last_result: string) => admin.from("coupang_ops_alerts").update({ last_result: last_result.slice(0, 300), updated_at: new Date().toISOString() }).eq("user_id", userId);
  const { data: row } = await admin.from("coupang_ops_alerts").select("channels").eq("user_id", userId).maybeSingle();
  const channels = cleanChannels(row?.channels);
  const targets = await loadTargets(userId);
  const subject = "[쿠팡 운영] 아침 요약";
  const notify = (text: string) => deliver(channels, targets, subject, text);
  try {
    const access = await checkProgramAccess(admin as Parameters<typeof checkProgramAccess>[0], userId, "coupang-ops");
    if (!access.allowed) return finish("이용 권한이 없어 건너뛰었습니다.");
    const keys = await getWingKeysForJob(userId);
    if (!keys) return finish("쿠팡 키가 없어 건너뛰었습니다.");
    return finish(await notify(summaryMessage(await readTodayCounts(keys))));
  } catch (e) {
    console.error("[coupang-summary]", (e as Error).name);
    return finish("보내지 못했습니다. 받을 곳 연결을 확인해 주세요.");
  }
}

async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: row } = await admin.from("coupang_ops_alerts").select("user_id,enabled,last_run_date").eq("token_hash", hash).maybeSingle();
  if (!row) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!row.enabled) return NextResponse.json({ accepted: true, enabled: false });
  // 하루 1번만: 날짜를 먼저 바꾼 실행만 진행한다(쿠팡 호출 보호)
  const today = kstDate();
  if (row.last_run_date === today) return NextResponse.json({ accepted: true, already: true });
  let claim = admin.from("coupang_ops_alerts").update({ last_run_date: today }).eq("user_id", row.user_id);
  claim = row.last_run_date ? claim.eq("last_run_date", row.last_run_date) : claim.is("last_run_date", null);
  const { data: claimed } = await claim.select("user_id").maybeSingle();
  if (!claimed) return NextResponse.json({ accepted: true, already: true });
  after(() => run(row.user_id));
  return NextResponse.json({ accepted: true });
}

export const GET = handle;
export const POST = handle;
