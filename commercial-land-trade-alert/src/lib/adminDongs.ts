// 행정동 이름 → 걸쳐 있는 법정동 코드. 자료는 public/admin-dongs.json(scripts/build-admin-dongs.mjs). 순수 함수만 둔다(시험 대상).
export type AdminDongRow = [name: string, legalCodes: string[]];

/** 「노량진 제1동」「노량진제1동」을 모두 「노량진1동」으로 맞춘다 */
export function normalizeDong(text: string): string {
  return text.replace(/\s+/g, "").replace(/제(\d)/g, "$1");
}

export function searchAdminDongs(rows: AdminDongRow[], query: string, limit = 20): AdminDongRow[] {
  const q = normalizeDong(query);
  if (q.length < 2) return [];
  const exact: AdminDongRow[] = [];
  const near: AdminDongRow[] = [];
  for (const r of rows) {
    const n = normalizeDong(r[0]);
    if (n === q) exact.push(r);
    else if (n.includes(q)) near.push(r);
  }
  return [...exact, ...near].slice(0, limit);
}
