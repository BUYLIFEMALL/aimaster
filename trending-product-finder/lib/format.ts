// 화면 공통 날짜 표기 — 한국 시간 고정(서버가 UTC여도 같은 시각으로 보이게)
const TZ = "Asia/Seoul";

export function formatDateTime(value: string): string {
  const dt = new Date(value);
  return `${dt.toLocaleDateString("ko-KR", { timeZone: TZ })} ${dt.toLocaleTimeString("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}
