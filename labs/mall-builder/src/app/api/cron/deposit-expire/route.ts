// 몰 운영자 본인 cron-job.org가 부르는 실행 주소(주문 알림이 켜져 있으면 1분, 아니면 10분마다) —
// 머리글의 몰 전용 토큰으로 그 몰만 처리한다: 기한 지난 입금 대기 주문 자동 취소(D8) → 알림 대기 줄 문자 발송(0025).
// 로그인 세션 없이 공개 키로 DB 함수만 부른다(서비스 키 없음). 토큰이 없거나 틀리면 401.
// 주소 이름은 D8 때 그대로 둔다 — 이미 등록된 운영자 cron-job.org 작업이 이 주소를 찾아 다시 쓰기 때문(바꾸면 작업이 둘로 늘어남).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { bearerToken, hashRunToken } from "@/lib/depositScheduler";
import { sendClaimed, type ClaimedItem, type Credentials } from "@/lib/notify";
import { sendSms } from "@/lib/solapi";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 120;

async function run(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });
  const hash = hashRunToken(token);

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("mall_builder_expire_deposits", { p_token_hash: hash });
  if (error) {
    if (error.message.includes("invalid_token")) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ error: "failed" }, { status: 500 });
  }

  // 자동 취소가 만든 「자동 취소 → 손님」 알림까지 이번에 함께 보낸다
  const claim = await supabase.rpc("mall_builder_notify_claim", { p_token_hash: hash, p_limit: 50 });
  if (claim.error) return Response.json({ ...(data as object), notify: { error: "claim_failed" } }, { status: 500 });
  const claimed = claim.data as { paused: boolean; items: ClaimedItem[]; credentials?: Credentials | null; reason?: string };
  if (!claimed.items.length) return Response.json({ ...(data as object), notify: { sent: 0, reason: claimed.reason ?? null } });

  const results = await sendClaimed(claimed.items, claimed.credentials ?? null, sendSms);
  const report = await supabase.rpc("mall_builder_notify_report", { p_token_hash: hash, p_results: results });
  const count = (r: string) => results.filter((x) => x.result === r).length;
  return Response.json({
    ...(data as object),
    notify: { sent: count("sent"), failed: count("failed"), unknown: count("unknown"), recorded: report.error ? null : report.data },
  });
}

export const GET = run;
export const POST = run;
