// 회원 조건과 표기. 서버·화면이 함께 쓰는 순수 함수만 둔다.

export interface Prefs {
  kinds: string[];
  excluded_uses: string[];
  excluded_jimoks: string[];
  min_amount: number | null;
  max_amount: number | null;
  min_area: number | null;
  max_area: number | null;
  include_share: boolean;
  notify_enabled: boolean;
}

// 도로·구거 등과 숙박은 찾는 회원이 드물고 건수가 많아(실측 도로 23%, 숙박 38%) 기본으로 뺀다. 회원이 켤 수 있다.
export const DEFAULT_PREFS: Prefs = {
  kinds: ["building", "land"],
  excluded_uses: ["숙박"],
  excluded_jimoks: ["도로", "구거", "하천", "제방", "유지"],
  min_amount: null,
  max_amount: null,
  min_area: null,
  max_area: null,
  include_share: false,
  notify_enabled: true,
};

export const BUILDING_USES = ["제1종근린생활", "제2종근린생활", "판매", "업무", "숙박", "교육연구", "기타"];
export const JIMOKS = ["대", "전", "답", "임야", "잡종지", "공장용지", "과수원", "창고용지", "주차장", "도로", "구거", "하천", "제방", "유지", "염전", "목장용지", "기타"];

export function normalizePrefs(row: Partial<Prefs> | null | undefined): Prefs {
  return { ...DEFAULT_PREFS, ...(row ?? {}) };
}

interface Matchable {
  kind: string;
  category: string;
  amount_manwon: number;
  area_m2: number | null;
  is_share: boolean;
  cancelled: boolean;
}

/** 취소 거래는 언제나 제외한다 */
export function matchesPrefs(t: Matchable, p: Prefs): boolean {
  if (t.cancelled) return false;
  if (!p.kinds.includes(t.kind)) return false;
  if ((t.kind === "building" ? p.excluded_uses : p.excluded_jimoks).includes(t.category)) return false;
  if (t.is_share && !p.include_share) return false;
  if (p.min_amount !== null && t.amount_manwon < p.min_amount) return false;
  if (p.max_amount !== null && t.amount_manwon > p.max_amount) return false;
  if (p.min_area !== null && (t.area_m2 === null || t.area_m2 < p.min_area)) return false;
  if (p.max_area !== null && (t.area_m2 === null || t.area_m2 > p.max_area)) return false;
  return true;
}

/** 만 원 단위 금액을 「5억 8,000만」처럼 표기한다 */
export function formatManwon(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  const n = Math.round(v);
  const eok = Math.floor(n / 10000);
  const rest = n % 10000;
  if (eok && rest) return `${eok.toLocaleString("ko-KR")}억 ${rest.toLocaleString("ko-KR")}만`;
  if (eok) return `${eok.toLocaleString("ko-KR")}억`;
  return `${rest.toLocaleString("ko-KR")}만`;
}

export function formatArea(v: number | null | undefined): string {
  if (v === null || v === undefined) return "-";
  return `${Number(v).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}㎡ (${(Number(v) / 3.3058).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}평)`;
}

export const kindLabel = (k: string) => (k === "building" ? "상가·건물" : "토지");

export function alertText(trades: { kind: string; sgg_nm: string; umd_nm: string; category: string; amount_manwon: number; area_m2: number | null; deal_date: string; is_share: boolean }[], siteUrl: string) {
  const lines = trades.map((t) => {
    const area = t.area_m2 ? ` · ${Math.round(Number(t.area_m2)).toLocaleString("ko-KR")}㎡` : "";
    return `• ${t.sgg_nm} ${t.umd_nm} ${kindLabel(t.kind)}(${t.category}) ${formatManwon(t.amount_manwon)}${area} · ${t.deal_date.slice(5)}${t.is_share ? " · 지분" : ""}`;
  });
  return `🏢 새 실거래 ${trades.length}건\n\n${lines.join("\n")}\n\n자세히 보기: ${siteUrl}/trades`;
}
