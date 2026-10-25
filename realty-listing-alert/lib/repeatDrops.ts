// 📉 여러 번 호가를 내린 매물(2026-10-25, v1.29 확장 제안 C) — 회원 PC 확장의 변동 기록(1년)에서 같은 매물의 「가격 내림」을 묶는다.
// 매물은 네이버 매물 주소(매물 번호 포함)로 같은 것을 찾는다. 화면 안에서만 계산(서버 미경유).

export type DropEvent = { at: string; type: string; row: unknown[] };
export type RepeatDrop = { key: string; complex: string; dong: string; area: string; floor: string; firstPrice: string; nowPrice: string; drops: number; lastAt: string; url: string };

/** 「가격 내림」이 minDrops번 이상인 매물 — 내린 횟수 많은 순, 같으면 최근 순 */
export function findRepeatDrops(events: DropEvent[], columns: string[], minDrops = 2): RepeatDrop[] {
  const c = (n: string) => columns.indexOf(n);
  const [url, cx, dong, area, floor, price, prev] = ["네이버 매물 주소", "단지명", "동", "전용면적(㎡)", "층", "가격(만 원)", "이전 가격"].map(c);
  if (url < 0 || price < 0) return [];
  const by = new Map<string, DropEvent[]>();
  for (const e of events || []) {
    if (e?.type !== "priceDown" || !Array.isArray(e.row)) continue;
    const key = String(e.row[url] ?? "");
    if (!key) continue;
    if (!by.has(key)) by.set(key, []);
    by.get(key)!.push(e);
  }
  const s = (r: unknown[], i: number) => (i >= 0 && r[i] != null ? String(r[i]) : "");
  const out: RepeatDrop[] = [];
  for (const [key, list] of by) {
    if (list.length < minDrops) continue;
    const sorted = [...list].sort((a, b) => a.at.localeCompare(b.at));
    const first = sorted[0].row, last = sorted[sorted.length - 1].row;
    out.push({
      key, complex: s(last, cx), dong: s(last, dong), area: s(last, area), floor: s(last, floor),
      firstPrice: s(first, prev) || s(first, price), nowPrice: s(last, price), drops: list.length, lastAt: sorted[sorted.length - 1].at, url: key,
    });
  }
  return out.sort((a, b) => b.drops - a.drops || b.lastAt.localeCompare(a.lastAt));
}
