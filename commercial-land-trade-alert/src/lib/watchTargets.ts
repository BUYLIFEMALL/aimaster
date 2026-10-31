// 감시 화면: 회원이 네이버 부동산에서 지역·필터를 맞춘 지도 주소를 그대로 저장한다. 순수 함수만 둔다(시험 대상).
export const MAX_TARGETS = 10;
const KINDS = ["SG", "GM", "TJ"];
export const KIND_LABEL: Record<string, string> = { SG: "상가", GM: "건물", TJ: "토지" };

/** 상가·건물·토지 지도 주소만 받는다. 열어 본 매물 번호는 지운다 */
export function parseWatchUrl(raw: string): { url: string; kinds: string } | null {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" || u.hostname !== "new.land.naver.com" || !u.pathname.startsWith("/offices")) return null;
    const a = (u.searchParams.get("a") ?? "").split(":").filter(Boolean);
    if (!u.searchParams.get("ms") || !a.length || !a.every((c) => KINDS.includes(c))) return null;
    u.searchParams.delete("articleNo");
    return { url: u.toString(), kinds: a.join(":") };
  } catch {
    return null;
  }
}

export const kindsText = (kinds: string) => kinds.split(":").map((k) => KIND_LABEL[k] ?? k).join("·");

/** 동 중심 좌표 → 네이버 지도 화면 주소. 대한민국 범위를 벗어나면 null */
export function buildRegionUrl(lat: number, lon: number, kinds: string): string | null {
  if (!(lat > 33 && lat < 39 && lon > 124 && lon < 132)) return null;
  if (!kinds || !kinds.split(":").every((k) => KINDS.includes(k))) return null;
  return `https://new.land.naver.com/offices?ms=${lat},${lon},16&a=${kinds}&e=RETAIL`;
}
