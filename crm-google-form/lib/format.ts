// 화면 공통 날짜 표기 (한국 시간 고정 — 서버(UTC)와 브라우저가 같은 값을 그리도록)
const TZ = "Asia/Seoul";

export function formatDateTime(value: string): string {
  const dt = new Date(value);
  return `${dt.toLocaleDateString("ko-KR", { timeZone: TZ })} ${dt.toLocaleTimeString("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", { timeZone: TZ });
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString("ko-KR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
}
