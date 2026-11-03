// 2단계(2026-11-03): 매물↔고객 조건 맞추기, 광고 문자 머리·꼬리, 밤 시간 막기, 광고 동의 2년 확인.
// 근거: 정보통신망법 시행령 제61조③·별표 6(2026-10-02 시행판 원문 대조) — 문자 등 음성 외 광고는
// 시작 부분에 「(광고)」·전송자 명칭·전화번호 또는 주소, 끝 부분에 수신자가 비용을 내지 않는 수신거부 방법.
// 법 제50조③ 밤 9시~아침 8시는 별도 동의가 필요 — 이 프로그램은 별도 동의를 받지 않으므로 그 시간에는 보내지 않는다.
// 시행령 제62조의3: 광고 수신 동의는 2년마다 다시 확인.

export const LISTING_STATUSES = ["광고 중", "계약", "내림"] as const;

export type MatchClient = {
  deal_type: string;
  regions: string | null;
  property_types: string[];
  budget_min: number | null;
  budget_max: number | null;
  monthly_max: number | null;
  area_min: number | null;
  status: string;
};
export type MatchListing = {
  deal_type: string;
  property_type: string;
  address: string;
  price: number;
  monthly: number | null;
  area_m2: number | null;
};

const BUDGET_SLACK = 1.05; // 예산보다 5%까지는 후보로 보여 준다(사람이 고름)

/** 조건이 맞으면 맞는 이유를, 안 맞으면 null */
export function matchReasons(c: MatchClient, l: MatchListing): string[] | null {
  if (c.status === "계약" || c.status === "종료") return null;
  if (c.deal_type !== l.deal_type) return null;
  const why: string[] = [l.deal_type];
  if (c.property_types.length) {
    if (!c.property_types.includes(l.property_type)) return null;
    why.push(l.property_type);
  }
  const words = (c.regions ?? "").split(/[,·/\s]+/).map((w) => w.trim()).filter((w) => w.length >= 2);
  if (words.length) {
    const hit = words.find((w) => l.address.includes(w));
    if (!hit) return null;
    why.push(hit);
  }
  if (c.budget_max !== null && l.price > c.budget_max * BUDGET_SLACK) return null;
  if (c.budget_min !== null && l.price < c.budget_min * 0.8) return null;
  if (c.budget_max !== null || c.budget_min !== null) why.push("예산 안");
  if (l.deal_type === "월세" && c.monthly_max !== null) {
    if (l.monthly !== null && l.monthly > c.monthly_max * BUDGET_SLACK) return null;
    why.push("월세 안");
  }
  if (c.area_min !== null && l.area_m2 !== null) {
    if (l.area_m2 < c.area_min * 0.95) return null;
    why.push("면적 맞음");
  }
  return why;
}

const TWO_YEARS_MS = 730 * 86_400_000;
const RECHECK_SOON_MS = 700 * 86_400_000; // 약 23개월: 「곧 재확인」 표시

export type AdEligibility = { ok: true; soon: boolean } | { ok: false; reason: string };

/** 광고 문자를 보낼 수 있는 고객인가(동의·수신거부·2년) */
export function adEligibility(c: { ad_consent_at: string | null; ad_optout_at: string | null }, now = Date.now()): AdEligibility {
  if (c.ad_optout_at) return { ok: false, reason: "수신거부" };
  if (!c.ad_consent_at) return { ok: false, reason: "광고 수신 미동의" };
  const age = now - new Date(c.ad_consent_at).getTime();
  if (age >= TWO_YEARS_MS) return { ok: false, reason: "동의 2년 지남 — 다시 확인 필요" };
  return { ok: true, soon: age >= RECHECK_SOON_MS };
}

/** 한국 시각 밤 9시~아침 8시면 true */
export function isNightKst(now = new Date()): boolean {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }).format(now));
  return h >= 21 || h < 8;
}

export type Office = { office_name: string; office_phone: string; office_address: string | null; reject_080: string | null };

/** 광고 문자 맨 앞: (광고)·전송자 명칭·전화번호. 빈칸·부호로 「(광고)」를 바꾸지 않는다(별표 6 공통 1) */
export function adHeader(o: Office): string {
  return `(광고)${o.office_name} ${o.office_phone}`;
}

/** 광고 문자 맨 끝: 수신자가 비용을 내지 않는 수신거부 방법(080 번호가 있으면 함께) */
export function adFooter(o: Office, optoutUrl: string): string {
  return o.reject_080 ? `무료수신거부 ${o.reject_080} / ${optoutUrl}` : `무료수신거부 ${optoutUrl}`;
}

export function composeAd(o: Office, body: string, optoutUrl: string): string {
  return `${adHeader(o)}\n${body.trim()}\n${adFooter(o, optoutUrl)}`;
}

const won = (v: number) => (v >= 10000 ? `${(v / 10000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억` : `${v.toLocaleString("ko-KR")}만`);

/** 매물로 본문 초안 만들기(중개사가 고쳐서 보냄) */
export function draftBody(l: MatchListing & { title: string; floor_info?: string | null; move_in?: string | null }): string {
  const price = l.deal_type === "월세" ? `보증금 ${won(l.price)}/월 ${won(l.monthly ?? 0)}` : `${l.deal_type} ${won(l.price)}`;
  const parts = [price, l.area_m2 ? `전용 ${l.area_m2}㎡` : "", l.floor_info ?? "", l.move_in ? `입주 ${l.move_in}` : ""].filter(Boolean);
  return `${l.title}\n${l.address}\n${parts.join(" · ")}\n찾으시던 조건에 맞는 매물이 나와 안내드립니다.`;
}
