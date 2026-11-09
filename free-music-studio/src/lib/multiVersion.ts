// 여러 버전 한 번에(2026-11-09 주인님 「하나의 가사로 각기 다른 장르·모델로 1곡씩」, 엔진 × 장르 조합 최대 8곡).
// 버전마다 음악 스타일은 AI가 서로 다른 느낌으로 새로 쓴다(/api/style-variants, 한 번 호출).

export const MULTI_MAX = 8;

export type VersionSlot = { engine: string; engineName: string; genre: string };

/** 고른 엔진 × 장르 → 버전 목록(최대 8). 엔진을 안 고르면 지금 엔진 하나, 장르를 안 고르면 장르 없음 */
export function buildSlots(engines: { id: string; name: string }[], genres: string[], current: { id: string; name: string }): VersionSlot[] {
  const es = engines.length ? engines : [current];
  const gs = genres.length ? genres : [""];
  const out: VersionSlot[] = [];
  for (const g of gs) for (const e of es) out.push({ engine: e.id, engineName: e.name, genre: g });
  return out.slice(0, MULTI_MAX);
}

/** 고른 개수만 보고 몇 곡이 되는지(8 넘으면 넘는 수 그대로 — 화면이 막음) */
export const slotCount = (engines: number, genres: number) => Math.max(1, engines) * Math.max(1, genres);

/** 제목 뒤 표시 — 「(재즈 · YuE2)」. 여러 개 고른 쪽만 붙인다(엔진 하나면 엔진 이름 생략) */
export function versionTitle(title: string, slot: VersionSlot, show: { genre: boolean; engine: boolean }, max = 80): string {
  const parts = [show.genre && slot.genre ? slot.genre : "", show.engine ? slot.engineName : ""].filter(Boolean);
  const base = title.trim() || "제목 없는 노래";
  if (!parts.length) return base.slice(0, max);
  const tail = ` (${parts.join(" · ")})`;
  return `${base.slice(0, Math.max(1, max - tail.length))}${tail}`;
}
