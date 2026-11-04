// 몰 운영자 본인 cron-job.org가 부르는 실행 주소(주문 알림이 켜져 있으면 1분, 아니면 10분마다) —
// 머리글의 몰 전용 토큰으로 그 몰만 처리한다: 기한 지난 입금 대기 주문 자동 취소(D8) → 알림 대기 줄 문자 발송(0025) → 메일 발송(0026, Resend).
// 로그인 세션 없이 공개 키로 DB 함수만 부른다(서비스 키 없음). 토큰이 없거나 틀리면 401.
// 주소 이름은 D8 때 그대로 둔다 — 이미 등록된 운영자 cron-job.org 작업이 이 주소를 찾아 다시 쓰기 때문(바꾸면 작업이 둘로 늘어남).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { bearerToken, hashRunToken } from "@/lib/depositScheduler";
import { sendClaimed, type ClaimedItem, type Credentials } from "@/lib/notify";
import { sendSms } from "@/lib/solapi";
import { sendEmailsClaimed, type EmailCredentials, type EmailItem } from "@/lib/resend";

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
  const sms = await sendChannel(hash, async () => {
    const claim = await supabase.rpc("mall_builder_notify_claim", { p_token_hash: hash, p_limit: 50 });
    if (claim.error) return null;
    const c = claim.data as { items: ClaimedItem[]; credentials?: Credentials | null; reason?: string };
    return { reason: c.reason, results: c.items.length ? await sendClaimed(c.items, c.credentials ?? null, sendSms) : [] };
  });
  const origin = new URL(request.url).origin;
  const email = await sendChannel(hash, async () => {
    const claim = await supabase.rpc("mall_builder_email_claim", { p_token_hash: hash, p_limit: 50 });
    if (claim.error) return null;
    const c = claim.data as { items: EmailItem[]; credentials?: EmailCredentials | null; reason?: string };
    return { reason: c.reason, results: c.items.length ? await sendEmailsClaimed(c.items, c.credentials ?? null, origin) : [] };
  });
  const failed = sms.error || email.error;
  return Response.json({ ...(data as object), notify: sms, email }, { status: failed ? 500 : 200 });

  /** 꺼내기 → 보내기 → 결과 기록. 꺼내기 실패면 error */
  async function sendChannel(
    tokenHash: string,
    claimAndSend: () => Promise<{ reason?: string; results: { id: string; result: string; error: string }[] } | null>,
  ) {
    const out = await claimAndSend();
    if (!out) return { error: "claim_failed" as const };
    if (!out.results.length) return { sent: 0, reason: out.reason ?? null };
    const report = await supabase.rpc("mall_builder_notify_report", { p_token_hash: tokenHash, p_results: out.results });
    const count = (r: string) => out.results.filter((x) => x.result === r).length;
    return { sent: count("sent"), failed: count("failed"), unknown: count("unknown"), recorded: report.error ? null : report.data };
  }
}

export const GET = run;
export const POST = run;
