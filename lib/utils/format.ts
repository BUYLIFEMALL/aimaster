/** 금액을 한국 원화 형식으로 포맷 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** 날짜를 한국 형식으로 포맷 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

/** 구독 만료일 계산 */
export function calcExpiresAt(
  billingType: "monthly" | "biannual" | "annual" | "lifetime"
): Date | null {
  if (billingType === "lifetime") return null;
  const days = { monthly: 30, biannual: 180, annual: 365 };
  const d = new Date();
  d.setDate(d.getDate() + days[billingType]);
  return d;
}

/** D-day 계산 */
export function daysRemaining(expiresAt: string | Date | null): string {
  if (!expiresAt) return "평생";
  const diff = Math.ceil(
    (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "만료됨";
  if (diff === 0) return "오늘 만료";
  return `D-${diff}`;
}

/** 한국 전화번호 자동 포맷 (예: 010-9926-3686, 02-1234-5678) */
export function formatPhoneNumber(value: string | null | undefined): string {
  if (!value) return "";
  const raw = value.replace(/[^0-9]/g, "");

  if (raw.startsWith("02")) {
    if (raw.length <= 2) return raw;
    if (raw.length <= 5) return `${raw.slice(0, 2)}-${raw.slice(2)}`;
    if (raw.length <= 9) return `${raw.slice(0, 2)}-${raw.slice(2, 5)}-${raw.slice(5)}`;
    return `${raw.slice(0, 2)}-${raw.slice(2, 6)}-${raw.slice(6, 10)}`;
  }

  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return `${raw.slice(0, 3)}-${raw.slice(3)}`;
  if (raw.length <= 11) return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7)}`;
  return `${raw.slice(0, 3)}-${raw.slice(3, 7)}-${raw.slice(7, 11)}`;
}

