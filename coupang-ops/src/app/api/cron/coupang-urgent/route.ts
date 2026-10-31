import { createHash } from "crypto";
import { after, NextRequest, NextResponse } from "next/server";
import { getWingKeysForJob } from "@/lib/data";
import { readUrgentCounts } from "@/lib/coupang/todayRead";
import { deliver, loadTargets } from "@/lib/alerts/deliver";
import { normalizePrefs, type Urgent } from "@/lib/coupang/prefs";
import { cleanChannels, urgentMessage, urgentRunKey } from "@/lib/coupang/summary";
import { checkProgramAccess } from "@/lib/programAccess";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

// R10 회원 전용 수시 알림 주소. 회원 cron-job.org 작업이 부른다(회원 토큰 해시로 그 회원만 처리, 읽기만, 쿠팡 쓰기 없음).
// 건수가 늘었을 때만 보내고, 곧바로 응답한 뒤 처리한다.
async function patchUrgent(userId: string, patch: Partial<Urgent>) {
  const admin = createAdminClient();
  const { data } = await admin.from("coupang_ops_prefs").select("data").eq("user_id", userId).maybeSingle();
  const prefs = normalizePrefs(data?.data);
  await admin.from("coupang_ops_prefs").update({ data: { ...prefs, urgent: { ...prefs.urgent, ...patch } }, updated_at: new Date().toISOString() }).eq("user_id", userId);
}

async function run(userId: string, urgent: Urgent) {
  const admin = createAdminClient();
  const finish = (lastResult: string) => patchUrgent(userId, { lastResult: lastResult.slice(0, 200) });
  try {
    const access = await checkProgramAccess(admin as Parameters<typeof checkProgramAccess>[0], userId, "coupang-ops");
    if (!access.allowed) return finish("이용 권한이 없어 건너뛰었습니다.");
    const keys = await getWingKeysForJob(userId);
    if (!keys) return finish("쿠팡 키가 없어 건너뛰었습니다.");
    const { stop, inquiries } = await readUrgentCounts(keys);
    const nextStop = "error" in stop ? urgent.stop : stop.count;
    const nextInq = "error" in inquiries ? urgent.inquiries : inquiries.count;
    const text = urgentMessage({ stop: urgent.stop, inquiries: urgent.inquiries }, { stop: "error" in stop ? null : stop.count, inquiries: "error" in inquiries ? null : inquiries.count });
    const failed = "error" in stop || "error" in inquiries;
    await patchUrgent(userId, { stop: nextStop, inquiries: nextInq });
    if (!text) return finish(failed ? "일부 항목을 읽지 못했습니다." : "새 건이 없어 보내지 않았습니다.");
    return finish(await deliver(cleanChannels(urgent.channels), await loadTargets(userId), "[쿠팡 운영] 새 요청 알림", text));
  } catch (e) {
    console.error("[coupang-urgent]", (e as Error).name);
    return finish("확인하지 못했습니다. 연결을 확인해 주세요.");
  }
}

async function handle(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim() ?? "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const hash = createHash("sha256").update(token).digest("hex");
  const { data: row } = await admin.from("coupang_ops_prefs").select("user_id,data,updated_at").eq("data->urgent->>tokenHash", hash).maybeSingle();
  if (!row) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const prefs = normalizePrefs(row.data);
  if (!prefs.urgent.enabled) return NextResponse.json({ accepted: true, enabled: false });
  // 같은 시간대에는 한 번만: 시간 표시를 먼저 바꾼 실행만 진행한다(쿠팡 호출 보호)
  const runKey = urgentRunKey();
  if (prefs.urgent.runKey === runKey) return NextResponse.json({ accepted: true, already: true });
  const urgent = { ...prefs.urgent, runKey };
  const { data: claimed } = await admin.from("coupang_ops_prefs").update({ data: { ...prefs, urgent }, updated_at: new Date().toISOString() }).eq("user_id", row.user_id).eq("updated_at", row.updated_at).select("user_id").maybeSingle();
  if (!claimed) return NextResponse.json({ accepted: true, already: true });
  after(() => run(row.user_id, urgent));
  return NextResponse.json({ accepted: true });
}

export const GET = handle;
export const POST = handle;
