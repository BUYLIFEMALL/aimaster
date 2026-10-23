// 첫 주소(/)로 들어온 검색값(?preset=·?src= 등)을 /convert 주소에 그대로 붙인다 — 순수 함수(시험 대상)
export function convertPath(searchParams: Record<string, string | string[] | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) params.append(key, v);
  }
  const query = params.toString();
  return query ? `/convert?${query}` : "/convert";
}
