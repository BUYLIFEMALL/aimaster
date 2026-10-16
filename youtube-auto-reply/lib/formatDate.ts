// Intl.DateTimeFormat("ko-KR", { hour12: true }) 조합은 Node의 ICU 데이터에서 "오전/오후" 대신
// "AM/PM"으로 렌더링되는 경우가 있어(2026-08-24 실제 확인), 오전/오후 표기는 직접 계산한다.
export function formatDateTimeKo(iso: string): string {
  const d = new Date(iso);
  const datePart = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "long", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const hours = Number(time.find((part) => part.type === "hour")!.value);
  const period = hours < 12 ? "오전" : "오후";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  const minutes = time.find((part) => part.type === "minute")!.value;
  return `${datePart} ${period} ${hour12}:${minutes}`;
}
