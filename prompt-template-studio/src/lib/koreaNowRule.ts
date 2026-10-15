export function koreaNowRule(now = new Date()): string {
  const [year, month] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(now).split("-").map(Number);

  return `[기준 시점: 한국 시간으로 지금은 ${year}년 ${month}월입니다. 계절·시기 표현은 현재 월에 맞추고, 연도·계절은 불필요하게 덧붙이지 마세요.]`;
}
