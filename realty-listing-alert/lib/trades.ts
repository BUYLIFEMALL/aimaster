// 실거래가 비교(2026-10-25, v1.19 — 주인님 「매물 호가와 같은 단지 실거래 평균을 비교」). 순수 함수만(시험용).
// 자료: 국토교통부 아파트 매매 실거래가(공공데이터포털 RTMSDataSvcAptTrade, 전국). 공공 데이터만 다루고 회원 매물은 받지 않는다.
// 키: 회원 본인 data_go_kr_service_key → 없으면 운영자 공용 키(주인님 승인 2026-10-25, docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8).

export const MOLIT_TRADE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

export type Trade = { aptNm: string; area: number; price: number; ymd: string; floor: string; canceled: boolean };
export type Band = { area: number; medianPerM2: number; count: number; lastYmd: string };

/** 단지 이름 맞추기용: 띄어쓰기·괄호·「아파트」·기호를 지우고 소문자로 */
export function normalizeAptName(s: string) {
  return String(s ?? "")
    .replace(/\(.*?\)/g, "")
    .replace(/아파트|apt/gi, "")
    .replace(/[\s·.,\-_'"]/g, "")
    .toLowerCase();
}

/** 네이버 단지 이름 ↔ 국토부 단지 이름: 같거나 한쪽이 다른 쪽을 포함(두 글자 이상) */
export function nameMatches(naverName: string, molitName: string) {
  const a = normalizeAptName(naverName);
  const b = normalizeAptName(molitName);
  if (a.length < 2 || b.length < 2) return false;
  return a === b || a.includes(b) || b.includes(a);
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
