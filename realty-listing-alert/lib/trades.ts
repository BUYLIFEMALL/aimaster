// 실거래가 비교(2026-10-25, v1.19 — 주인님 「매물 호가와 같은 단지 실거래 평균을 비교」). 순수 함수만(시험용).
// 자료: 국토교통부 아파트 매매 실거래가(공공데이터포털 RTMSDataSvcAptTrade, 전국). 공공 데이터만 다루고 회원 매물은 받지 않는다.
// 키: 회원 본인 data_go_kr_service_key → 없으면 운영자 공용 키(주인님 승인 2026-10-25, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8).

export const MOLIT_TRADE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

export type Trade = { aptNm: string; area: number; price: number; ymd: string; floor: string; canceled: boolean };
export type Band = { area: number; medianPerM2: number; count: number; lastYmd: string };

/** 단지 이름 맞추기용(2026-10-26 보강 — 네이버 「백송대림」 ↔ 국토부 「백송마을5단지(대림)」처럼 「마을·○단지」가 붙으면 못 맞추던 문제):
 *  주거복합·도시형 같은 꼬리말·「아파트」·「마을」·「○단지」·숫자를 지우고, 괄호는 기호만 지워 안의 단지명은 살린다 */
export function normalizeAptName(s: string) {
  return String(s ?? "")
    .replace(/\((주거복합|도시형|도시형생활주택|임대|재건축)\)/g, "")
    .replace(/아파트|apt/gi, "")
    .replace(/마을|\d+단지|단지|\d+/g, "")
    .replace(/[\s·.,\-_'"()[\]]/g, "")
    .toLowerCase();
}

/** 네이버 단지 이름 ↔ 국토부 단지 이름: 같거나 한쪽이 다른 쪽을 포함 — 짧은 쪽이 긴 쪽의 60% 이상일 때만(「백송」 같은 짧은 이름이 아무 데나 맞지 않게) */
export function nameMatches(naverName: string, molitName: string) {
  const a = normalizeAptName(naverName);
  const b = normalizeAptName(molitName);
  if (a.length < 2 || b.length < 2) return false;
  if (a === b) return true;
  // 시공사가 여럿인 단지(2026-10-29, 실측): 네이버 「백송선경,코오롱8단지」 ↔ 국토부는 「백송마을(선경)」 「백송마을(코오롱)」 둘로 나눠 신고.
  // 네이버 이름에 쉼표가 있을 때만, 국토부 「마을이름(시공사)」의 마을이름으로 시작하고 시공사를 품으면 같은 단지(둘 다 2글자 이상)
  const joint = String(molitName ?? "").match(/^(.+?)\(([^()]+)\)\s*$/);
  if (String(naverName ?? "").includes(",") && joint) {
    const head = normalizeAptName(joint[1]);
    const builder = normalizeAptName(joint[2]);
    if (head.length >= 2 && builder.length >= 2 && a.startsWith(head) && a.slice(head.length).includes(builder)) return true;
  }
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.includes(short) && short.length / long.length >= 0.6;
}

/** 못 맞췄을 때 진단용: 그 지역 국토부 거래에서 많이 나온 단지 이름 몇 개(공공 데이터) */
export function topAptNames(trades: Trade[], n = 6): string[] {
  const c = new Map<string, number>();
  for (const t of trades) if (t.aptNm) c.set(t.aptNm, (c.get(t.aptNm) || 0) + 1);
  return [...c].sort((x, y) => y[1] - x[1]).slice(0, n).map(([k]) => k);
}

/** 진단 K(2026-10-26): 못 맞춘 단지와 글자가 많이 겹치는 국토부 단지 이름(두 글자 묶음이 2개 이상 겹침) — 이름 맞추기 보완 판단용 */
export function similarAptNames(naverName: string, trades: Trade[], n = 5): string[] {
  const a = normalizeAptName(naverName);
  const grams = new Set<string>();
  for (let i = 0; i + 1 < a.length; i++) grams.add(a.slice(i, i + 2));
  const score = new Map<string, number>();
  for (const t of trades) {
    if (!t.aptNm || score.has(t.aptNm)) continue;
    const b = normalizeAptName(t.aptNm);
    let s = 0;
    for (const g of grams) if (b.includes(g)) s++;
    if (s >= 2) score.set(t.aptNm, s);
  }
  return [...score].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0])).slice(0, n).map(([k]) => k);
}

/** 최근 n개월 「yyyymm」(이번 달 포함, 한국 시간 기준) */
export function recentMonths(now: Date, n: number) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}

const num = (v: unknown) => Number(String(v ?? "").replace(/[,\s]/g, ""));

function toTrade(it: Record<string, unknown>): Trade | null {
  const area = num(it.excluUseAr);
  const price = num(it.dealAmount); // 만 원
  if (!Number.isFinite(area) || area <= 0 || !Number.isFinite(price) || price <= 0) return null;
  const y = String(it.dealYear ?? "").trim();
  const m = String(it.dealMonth ?? "").trim().padStart(2, "0");
  const d = String(it.dealDay ?? "").trim().padStart(2, "0");
  return {
    aptNm: String(it.aptNm ?? "").trim(),
    area,
    price,
    ymd: `${y}${m}${d}`,
    floor: String(it.floor ?? "").trim(),
    canceled: String(it.cdealType ?? "").trim() === "O", // 해제된 거래
  };
}

/** 응답(JSON 또는 XML 글자) → 거래 목록. 결과 코드가 정상이 아니면 { error } */
export function parseTradeResponse(text: string): { trades: Trade[]; error?: string } {
  const t = String(text ?? "").trim();
  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      const head = j?.response?.header;
      if (head && head.resultCode && !/^0+$/.test(String(head.resultCode))) return { trades: [], error: `${head.resultCode} ${head.resultMsg ?? ""}`.trim() };
      const raw = j?.response?.body?.items?.item;
      const arr = Array.isArray(raw) ? raw : raw ? [raw] : [];
      return { trades: arr.map(toTrade).filter((x): x is Trade => !!x) };
    } catch {
      return { trades: [], error: "응답을 읽지 못했어요." };
    }
  }
  const code = t.match(/<resultCode>\s*([^<]*)<\/resultCode>/)?.[1]?.trim();
  const authErr = t.match(/<returnAuthMsg>\s*([^<]*)<\/returnAuthMsg>/)?.[1]?.trim();
  if (authErr) return { trades: [], error: authErr };
  if (code && !/^0+$/.test(code)) return { trades: [], error: `${code} ${t.match(/<resultMsg>\s*([^<]*)<\/resultMsg>/)?.[1]?.trim() ?? ""}`.trim() };
  const items = t.match(/<item>[\s\S]*?<\/item>/g) || [];
  const trades = items.map((x) => {
    const o: Record<string, string> = {};
    for (const m of x.matchAll(/<(\w+)>\s*([^<]*?)\s*<\/\1>/g)) o[m[1]] = m[2];
    return toTrade(o);
  }).filter((x): x is Trade => !!x);
  return { trades };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** 같은 단지(이름)·해제 아닌 거래를 전용면적(반올림 ㎡)별로 묶어 ㎡당 중간값(만 원) */
export function summarizeTrades(trades: Trade[], naverName: string): { matchedName: string | null; bands: Band[] } {
  const mine = trades.filter((t) => !t.canceled && nameMatches(naverName, t.aptNm));
  const groups = new Map<number, Trade[]>();
  for (const t of mine) {
    const k = Math.round(t.area);
    groups.set(k, [...(groups.get(k) || []), t]);
  }
  const bands = [...groups].map(([area, ts]) => ({
    area,
    medianPerM2: Math.round(median(ts.map((t) => t.price / t.area))),
    count: ts.length,
    lastYmd: ts.map((t) => t.ymd).sort().at(-1) || "",
  })).sort((a, b) => a.area - b.area);
  return { matchedName: mine[0]?.aptNm ?? null, bands };
}

/** 매물 1건(만 원·㎡)의 실거래 대비 %: 전용면적 ±3㎡ 안의 가장 가까운 면적대 ㎡당 중간값과 비교. 없으면 null */
export function compareToTrades(price: number | null, area: number | null, bands: Band[]): { pct: number; band: Band } | null {
  if (!price || !area || !bands.length) return null;
  const near = bands.filter((b) => Math.abs(b.area - area) <= 3).sort((a, b) => Math.abs(a.area - area) - Math.abs(b.area - area))[0];
  if (!near) return null;
  return { pct: Math.round(((price / area) / near.medianPerM2 - 1) * 100), band: near };
}
