// 플랫폼(운영자 SMTP) 메일 발송 안전장치의 판단 규칙. 네트워크·DB 없이 값만 보고 결정한다(테스트 가능).
// 목적: Gmail 한도 오류(429·4.7.0·5.4.5 등)가 났을 때 연달아 재시도하지 않고, 같은 메일을 짧은 시간에 중복 발송하지 않으며,
// 수신자별·하루 전체 발송 상한을 넘기지 않아 운영자 계정이 제한·정지되는 일을 막는다.
export type EmailKind = "welcome" | "payment" | "expiry" | "support_admin" | "support_confirm";

export const GUARD_CONFIG = {
  /** 한도·인증 오류가 난 뒤 이 시간 동안은 어떤 메일도 보내지 않는다. */
  cooldownMinutes: 30,
  /** 같은 수신자·같은 종류·같은 제목은 이 시간 안에 다시 보내지 않는다. */
  duplicateWindowMinutes: 10,
  /** 하루(24시간) 전체 발송 상한. 환경변수 EMAIL_DAILY_LIMIT로 바꿀 수 있다. */
  globalDailyLimit: 300,
  /** 같은 수신자에게 종류별로 하루에 보낼 수 있는 최대 통수. */
  perRecipientDaily: { welcome: 1, payment: 5, expiry: 5, support_admin: 20, support_confirm: 3 } as Record<EmailKind, number>,
};

export type GuardConfig = typeof GUARD_CONFIG;

export function resolveGlobalLimit(envValue: string | undefined, fallback = GUARD_CONFIG.globalDailyLimit): number {
  const n = Number(envValue);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export interface GuardFacts {
  /** 쿨다운 기간 안에 한도·인증 오류가 있었는지(있으면 그 시각) */
  recentBlockAt: Date | null;
  /** 같은 수신자·종류·제목으로 중복 방지 기간 안에 이미 보낸 것이 있는지 */
  duplicateSentRecently: boolean;
  /** 같은 수신자에게 같은 종류를 최근 24시간에 보낸 통수 */
  recipientSentLast24h: number;
  /** 최근 24시간 전체 발송 통수 */
  globalSentLast24h: number;
}

export type GuardDecision =
  | { allow: true }
  | { allow: false; reason: "cooldown" | "duplicate" | "recipient_limit" | "daily_limit" };

export function decideSend(kind: EmailKind, facts: GuardFacts, config: GuardConfig = GUARD_CONFIG, globalLimit = config.globalDailyLimit): GuardDecision {
  if (facts.recentBlockAt) return { allow: false, reason: "cooldown" };
  if (facts.duplicateSentRecently) return { allow: false, reason: "duplicate" };
  if (facts.recipientSentLast24h >= config.perRecipientDaily[kind]) return { allow: false, reason: "recipient_limit" };
  if (facts.globalSentLast24h >= globalLimit) return { allow: false, reason: "daily_limit" };
  return { allow: true };
}

export type SendErrorClass = "rate_limited" | "auth_failed" | "other";

/** SMTP/Gmail 오류를 분류한다. rate_limited·auth_failed면 쿨다운을 건다(같은 계정으로 계속 두드리지 않기 위해). */
export function classifySendError(err: unknown): SendErrorClass {
  const e = err as { responseCode?: number; code?: string; message?: string; response?: string } | null;
  const text = `${e?.message ?? ""} ${e?.response ?? ""}`;
  const code = Number(e?.responseCode);
  if (e?.code === "EAUTH" || code === 535 || code === 534 || /invalid login|username and password not accepted|authentication/i.test(text)) {
    return "auth_failed";
  }
  if (
    [421, 450, 451, 452, 454].includes(code) ||
    /rate limit|user-rate|quota|too many|daily user sending|5\.4\.5|4\.7\.0|try again later|exceeded/i.test(text)
  ) {
    return "rate_limited";
  }
  return "other";
}
