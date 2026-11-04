// 주문 알림(문자) — 화면·서버·실행 주소가 함께 쓰는 순수 계산(DB 0025와 같은 기준)
// 플랜: docs/PLAN_20261104_ORDER_NOTIFY.md. 솔라피 SDK 호출은 src/lib/solapi.ts(서버 전용)에 두고 여기서는 주입받는다.

export const NOTIFY_KINDS = [
  { key: "staff_new_order", label: "새 주문 → 운영자", hint: "주문 번호·금액·결제 방식" },
  { key: "customer_received", label: "주문 접수 → 손님", hint: "입금 금액·계좌·입금 기한(무통장)" },
  { key: "customer_paid", label: "입금 확인 → 손님", hint: "결제 완료로 바꿀 때" },
  { key: "customer_shipped", label: "발송 → 손님", hint: "택배사·송장 번호" },
  { key: "customer_expired", label: "자동 취소 → 손님", hint: "입금 기한이 지나 취소될 때" },
] as const;

export type NotifyKind = (typeof NOTIFY_KINDS)[number]["key"];

export const NOTIFY_KIND_LABEL: Record<string, string> = {
  ...Object.fromEntries(NOTIFY_KINDS.map((k) => [k.key, k.label])),
  test: "시험 문자",
};

export const NOTIFY_STATUS_LABEL: Record<string, string> = {
  queued: "대기",
  sending: "보내는 중",
  sent: "보냄",
  failed: "실패",
  unknown: "확인 필요",
  expired: "보내지 않음(하루 지남)",
};

/** 체크된 값 중 알려진 종류만(순서 고정) */
export function parseKinds(values: string[]): NotifyKind[] {
  const set = new Set(values);
  return NOTIFY_KINDS.map((k) => k.key).filter((k) => set.has(k));
}

/** 숫자만(010-1234-5678 → 01012345678) */
export function digits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** 발신번호: 솔라피에 등록한 번호(일반 전화 가능), 비우면 허용 */
export function checkSenderPhone(phone: string): string | null {
  const d = digits(phone);
  if (d === "") return null;
  return /^0\d{8,10}$/.test(d) ? null : "발신번호 형식이 올바르지 않습니다.";
}

/** 알림 받을 번호: 핸드폰만, 비우면 허용 */
export function checkMobile(phone: string): string | null {
  const d = digits(phone);
  if (d === "") return null;
  return /^01[016789]\d{7,8}$/.test(d) ? null : "알림 받을 번호는 핸드폰 번호로 입력해 주세요.";
}

/** 화면 표시용: 뒤 4자리만 보이게(01012345678 → ***-****-5678) */
export function maskPhone(phone: string): string {
  const d = digits(phone);
  return d.length >= 4 ? `***-****-${d.slice(-4)}` : "***";
}

/** 알림이 켜져 있으면 1분, 아니면 10분마다 확인 */
export const EVERY_MINUTE = [-1];

export type SendResult = "sent" | "failed" | "unknown";

/**
 * 솔라피 오류 → 결과. 요청이 거절된 게 분명하면 failed(문자 안 나감),
 * 네트워크·알 수 없는 오류처럼 나갔는지 모르면 unknown(이중 과금 방지로 다시 보내지 않음)
 */
export function classifySendError(error: unknown): { result: SendResult; message: string } {
  const tag = (error as { _tag?: string } | null)?._tag ?? (error as Error | null)?.name ?? "";
  const raw = error instanceof Error ? error.message : String(error ?? "");
  const message = raw.slice(0, 200) || "알 수 없는 오류";
  if (/ApiKeyError|BadRequestError|ClientError|MessageNotReceivedError|DefaultError|InvalidDateError/.test(tag)) {
    return { result: "failed", message };
  }
  return { result: "unknown", message };
}

export type ClaimedItem = { id: string; to: string; body: string };
export type Credentials = { api_key: string; api_secret: string; sender_phone: string };
export type Sender = (creds: Credentials, to: string, text: string) => Promise<void>;

/** 꺼낸 대기 줄을 하나씩 보내고 결과 목록을 만든다(한 건 실패가 나머지를 막지 않음) */
export async function sendClaimed(items: ClaimedItem[], creds: Credentials | null, send: Sender) {
  const results: { id: string; result: SendResult; error: string }[] = [];
  for (const item of items) {
    if (!creds) {
      results.push({ id: item.id, result: "failed", error: "솔라피 키가 없습니다." });
      continue;
    }
    try {
      await send(creds, item.to, item.body);
      results.push({ id: item.id, result: "sent", error: "" });
    } catch (e) {
      const c = classifySendError(e);
      results.push({ id: item.id, result: c.result, error: c.message });
    }
  }
  return results;
}
