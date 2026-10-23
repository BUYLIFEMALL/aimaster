export function getKoreaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function getExplicitYears(...values: string[]) {
  return new Set(values.flatMap((value) => value.match(/\b(?:19|20)\d{2}\b/g) ?? []));
}

export function hasUnrequestedYear(value: string, allowedYears: Set<string>) {
  return (value.match(/\b(?:19|20)\d{2}\b/g) ?? []).some((year) => !allowedYears.has(year));
}
