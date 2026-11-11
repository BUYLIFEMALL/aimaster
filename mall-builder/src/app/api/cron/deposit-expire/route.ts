// 몰 운영자 본인 cron-job.org가 부르는 실행 주소(주문 알림이 켜져 있으면 1분, 아니면 10분마다) —
// 머리글의 몰 전용 토큰으로 그 몰만 처리한다: 기한 지난 입금 대기 주문 자동 취소(D8) → 자동 배송 완료·구매 확정(D12) → 알림 대기 줄 문자 발송(0025) → 메일 발송(0026, Resend). 재입고 알림(D16)·포인트 소멸 예정(D18)도 같은 대기 줄로 나간다.
// 로그인 세션 없이 공개 키로 DB 함수만 부른다(서비스 키 없음). 토큰이 없거나 틀리면 401.
// 주소 이름은 D8 때 그대로 둔다 — 이미 등록된 운영자 cron-job.org 작업이 이 주소를 찾아 다시 쓰기 때문(바꾸면 작업이 둘로 늘어남).
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { bearerToken, hashRunToken } from "@/lib/depositScheduler";
import { fillSite, sendClaimed, type ClaimedItem, type Credentials } from "@/lib/notify";
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

  // 자동 배송 완료·구매 확정(D12) — 꺼져 있으면 DB 함수가 0건으로 끝난다. 실패해도 자동 취소·알림 발송은 계속한다
  const progress = await supabase.rpc("mall_builder_auto_progress", { p_token_hash: hash });
  const auto = progress.error ? { error: "auto_progress_failed" as const } : progress.data;

  // 재입고 알림 신청 정리(D16) — 90일 넘은 대기 만료, 끝난 지 30일 넘은 신청의 번호·메일 지움
  const restock = await supabase.rpc("mall_builder_restock_cleanup", { p_token_hash: hash });

  // 쿠폰·포인트(D17·D18) — 생일 쿠폰 발급, 기간 지난 포인트 소멸, 7일 안 소멸 예정 문자(아래 문자 발송에 함께 나감). 여러 번 불려도 같은 결과
  const benefits = await supabase.rpc("mall_builder_benefits_run", { p_token_hash: hash });

  // 공동구매(D21) — 마감 지난 공동구매 판정(성공·실패, 참여 손님 문자는 아래 발송에 함께). 취소·환불은 운영자 버튼
  const groupBuy = await supabase.rpc("mall_builder_group_buy_run", { p_token_hash: hash });

  // 정기 주문(D30) — 오늘(한국) 주문일이 된 정기 주문을 만든다(8시 이후, 같은 회차 한 번만). 성공 알림은 주문 알림으로, 실패 문자는 아래 발송에 함께
  const recurring = await supabase.rpc("mall_builder_recurring_run", { p_token_hash: hash });

  // 재입고 알림 문구 속 {{site}}는 이 사이트 주소로 바꿔 보낸다(DB는 사이트 주소를 모른다)
  const origin = new URL(request.url).origin;
  // 자동 취소가 만든 「자동 취소 → 손님」 알림까지 이번에 함께 보낸다
  const sms = await sendChannel(hash, async () => {
    const claim = await supabase.rpc("mall_builder_notify_claim", { p_token_hash: hash, p_limit: 50 });
    if (claim.error) return null;
    const c = claim.data as { items: ClaimedItem[]; credentials?: Credentials | null; reason?: string };
    return { reason: c.reason, results: c.items.length ? await sendClaimed(c.items.map((i) => ({ ...i, body: fillSite(i.body, origin) })), c.credentials ?? null, sendSms) : [] };
  });
  const email = await sendChannel(hash, async () => {
    const claim = await supabase.rpc("mall_builder_email_claim", { p_token_hash: hash, p_limit: 50 });
    if (claim.error) return null;
    const c = claim.data as { items: EmailItem[]; credentials?: EmailCredentials | null; reason?: string };
    return { reason: c.reason, results: c.items.length ? await sendEmailsClaimed(c.items.map((i) => ({ ...i, body: fillSite(i.body, origin) })), c.credentials ?? null, origin) : [] };
  });
  const failed = sms.error || email.error || progress.error;
  return Response.json({ ...(data as object), auto, restock: restock.error ? { error: "restock_cleanup_failed" } : restock.data, benefits: benefits.error ? { error: "benefits_failed" } : benefits.data, groupBuy: groupBuy.error ? { error: "group_buy_failed" } : groupBuy.data, recurring: recurring.error ? { error: "recurring_failed" } : recurring.data, notify: sms, email }, { status: failed ? 500 : 200 });

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
