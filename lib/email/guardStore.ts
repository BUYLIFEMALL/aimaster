// 메일 발송 안전장치가 쓰는 기록 표(platform_email_log) 읽기·쓰기. 서비스 키로만 접근한다.
// 기록 표에 문제가 있어도 메일 발송 자체를 막지 않는다(실패하면 조용히 건너뛰고 경고만 남김).
import { createServiceClient } from "@/lib/supabase/service";
import { GUARD_CONFIG, type EmailKind, type GuardFacts, type GuardConfig } from "./guard";

const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000).toISOString();

export async function loadGuardFacts(
  to: string,
  kind: EmailKind,
  subjectKey: string,
  config: GuardConfig = GUARD_CONFIG
): Promise<GuardFacts | null> {
  try {
    const db = createServiceClient();
    const since24h = minutesAgo(24 * 60);

    const [block, duplicate, recipient, global] = await Promise.all([
      db
        .from("platform_email_log")
        .select("created_at")
        .in("status", ["rate_limited", "auth_failed"])
        .gte("created_at", minutesAgo(config.cooldownMinutes))
        .order("created_at", { ascending: false })
        .limit(1),
      db
        .from("platform_email_log")
        .select("id")
        .eq("to_email", to)
        .eq("kind", kind)
        .eq("subject_key", subjectKey)
        .eq("status", "sent")
        .gte("created_at", minutesAgo(config.duplicateWindowMinutes))
        .limit(1),
      db
        .from("platform_email_log")
        .select("id", { count: "exact", head: true })
        .eq("to_email", to)
        .eq("kind", kind)
        .eq("status", "sent")
        .gte("created_at", since24h),
      db
        .from("platform_email_log")
        .select("id", { count: "exact", head: true })
        .eq("status", "sent")
        .gte("created_at", since24h),
    ]);

    if (block.error || duplicate.error || recipient.error || global.error) {
      console.warn("[Email] 발송 기록 조회 실패 — 안전장치 없이 진행합니다.");
      return null;
    }

    return {
      recentBlockAt: block.data?.[0]?.created_at ? new Date(block.data[0].created_at) : null,
      duplicateSentRecently: (duplicate.data?.length ?? 0) > 0,
      recipientSentLast24h: recipient.count ?? 0,
      globalSentLast24h: global.count ?? 0,
    };
  } catch (err) {
    console.warn("[Email] 발송 기록 조회 오류 — 안전장치 없이 진행합니다.", err);
    return null;
  }
}

export async function recordEmail(
  to: string,
  kind: EmailKind,
  subjectKey: string,
  status: "sent" | "failed" | "rate_limited" | "auth_failed" | "skipped",
  reason?: string
): Promise<void> {
  try {
    const { error } = await createServiceClient()
      .from("platform_email_log")
      .insert({ to_email: to, kind, subject_key: subjectKey, status, reason: reason ? reason.slice(0, 300) : null });
    if (error) console.warn("[Email] 발송 기록 저장 실패:", error.message);
  } catch (err) {
    console.warn("[Email] 발송 기록 저장 오류:", err);
  }
}

/** 30일이 지난 발송 기록을 지운다(매일 한 번 호출). */
export async function purgeOldEmailLog(days = 30): Promise<void> {
  try {
    await createServiceClient()
      .from("platform_email_log")
      .delete()
      .lt("created_at", minutesAgo(days * 24 * 60));
  } catch (err) {
    console.warn("[Email] 오래된 발송 기록 정리 실패:", err);
  }
}
