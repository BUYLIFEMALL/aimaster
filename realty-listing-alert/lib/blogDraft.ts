// 연계 I(2026-10-29, 주인님 「이걸 하자」): 단지 시세 요약 → 「블로그 포스팅 자동화」 글쓰기 화면에 주제·키워드 미리 채우기.
// 블로그 쪽 입구는 이미 있다(`ai-auto-blog/app/write/ai-form/page.tsx`가 ?topic=·?keywords= 를 읽음) — 블로그 코드는 고치지 않는다.
// 넘기는 것은 단지 이름과 요약 숫자뿐(중개사·전화번호·매물 번호·동호수 없음). 회원이 버튼을 눌렀을 때만 주소로 넘어간다.

export const BLOG_WRITE_URL = "https://ai-auto-blog.buylife.xyz/write/ai-form";
const TOPIC_MAX = 120;

// v1.37(추가개선 6): 글을 쓸 곳을 회원이 고른다. 두 프로그램 모두 /write/ai-form?topic=&keywords= 입구가 이미 있다(코드 변경 없음).
export type DraftTarget = "blog" | "tistory";
export const DRAFT_TARGETS: Record<DraftTarget, { label: string; url: string }> = {
  blog: { label: "블로그 포스팅 자동화", url: BLOG_WRITE_URL },
  tistory: { label: "티스토리 포스팅 자동화", url: "https://tistory-auto-blog.buylife.xyz/write/ai-form" },
};
export const isDraftTarget = (v: unknown): v is DraftTarget => v === "blog" || v === "tistory";

function draftLink(draft: { topic: string; keywords: string[] }, target: DraftTarget) {
  // 받는 쪽이 keywords를 쉼표로 나누므로 「백송풍림,삼호」 같은 단지 이름 안 쉼표는 「·」로 바꿔 한 키워드로 남긴다(2026-10-29 실물 확인)
  const keywords = draft.keywords.map((k) => k.replace(/\s*,\s*/g, "·")).join(",");
  return `${DRAFT_TARGETS[target].url}?${new URLSearchParams({ topic: draft.topic, keywords }).toString()}`;
}

export type DraftStat = {
  name: string;
  total: number;
  events: { new: number; priceDown: number; priceUp: number; gone: number };
  saleAvg: number | null; // 매매 평균(만 원)
  saleN: number;
  jeonseAvg: number | null; // 전세 평균(만 원)
  tradeGapAvg: number | null; // 실거래 대비 평균 %
};

/** 만 원 → 「4억 2,000만 원」 */
function wonText(v: number) {
  const eok = Math.floor(v / 10000);
  const rest = Math.round(v % 10000);
  if (!eok) return `${rest.toLocaleString("ko-KR")}만 원`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
}

/** 단지 이름에서 숫자·전화번호처럼 보이는 긴 숫자 덩어리를 지운다(혹시 섞여 들어와도 넘기지 않게) */
function cleanName(name: string) {
  return String(name ?? "").replace(/\d{3,}[-\s]?\d{3,}[-\s]?\d{0,4}/g, "").replace(/\s+/g, " ").trim();
}

export function buildBlogDraft(stat: DraftStat, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const name = cleanName(stat.name);
  const parts: string[] = [];
  if (stat.saleAvg != null && stat.saleN > 0) parts.push(`매매 평균 ${wonText(stat.saleAvg)}`);
  if (stat.jeonseAvg != null) parts.push(`전세 평균 ${wonText(stat.jeonseAvg)}`);
  if (stat.tradeGapAvg != null) parts.push(`실거래 대비 ${stat.tradeGapAvg > 0 ? "+" : ""}${stat.tradeGapAvg}%`);
  const moves = [stat.events.new ? `새 매물 ${stat.events.new}건` : "", stat.events.priceDown ? `가격 내림 ${stat.events.priceDown}건` : ""].filter(Boolean);
  if (moves.length) parts.push(moves.join("·"));
  let topic = `${year}년 ${month}월 ${name} 아파트 매물 시세${parts.length ? ` — ${parts.join(", ")}` : ""}`;
  if (topic.length > TOPIC_MAX) topic = topic.slice(0, TOPIC_MAX - 1) + "…";
  const base = name.replace(/\s/g, "");
  const keywords = [name, `${base} 시세`, `${base} 매매`, `${year} 아파트 시세`].filter((k, i, a) => k && a.indexOf(k) === i);
  return { topic, keywords };
}

export function buildBlogDraftLink(stat: DraftStat, now = new Date(), target: DraftTarget = "blog") {
  return draftLink(buildBlogDraft(stat, now), target);
}

// v1.37(추가개선 5): 지난 주간 리포트 기간(from~to, YYYY-MM-DD) 안 수집 기록의 변동을 더해 「주간 동향」 글감을 만든다.
// 확장이 이미 웹에 건네는 요약 기록(history)만 쓴다 — 매물 줄·중개사·전화번호는 쓰지 않는다.
export type WeeklySnap = { at: string; complexes: { name: string; events: { new: number; priceDown: number; priceUp: number; gone: number } }[] };

function dayLabel(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return { m, d };
}

export function buildWeeklyDraft(history: WeeklySnap[], from: string, to: string, now = new Date()) {
  const inRange = history.filter((s) => {
    const day = new Date(s.at).toISOString().slice(0, 10);
    return day >= from && day <= to;
  });
  if (!inRange.length) return null;
  const sum = { new: 0, priceDown: 0, priceUp: 0, gone: 0 };
  const names: string[] = [];
  for (const s of inRange) {
    for (const c of s.complexes) {
      sum.new += c.events.new; sum.priceDown += c.events.priceDown; sum.priceUp += c.events.priceUp; sum.gone += c.events.gone;
      const n = cleanName(c.name);
      if (n && !names.includes(n)) names.push(n);
    }
  }
  if (!names.length) return null;
  const a = dayLabel(from), b = dayLabel(to);
  const period = a.m === b.m ? `${a.m}월 ${a.d}일~${b.d}일` : `${a.m}월 ${a.d}일~${b.m}월 ${b.d}일`;
  const who = names.length > 2 ? `${names.slice(0, 2).join("·")} 외 ${names.length - 2}곳` : names.join("·");
  const moves = [sum.new ? `새 매물 ${sum.new}건` : "", sum.priceDown ? `가격 내림 ${sum.priceDown}건` : "", sum.priceUp ? `가격 오름 ${sum.priceUp}건` : "", sum.gone ? `목록에서 내려감 ${sum.gone}건` : ""].filter(Boolean);
  const year = now.getFullYear();
  let topic = `${year}년 ${period} ${who} 아파트 매물 주간 동향${moves.length ? ` — ${moves.join(", ")}` : ""}`;
  if (topic.length > TOPIC_MAX) topic = topic.slice(0, TOPIC_MAX - 1) + "…";
  const keywords = [...names.slice(0, 3), `${year} 아파트 주간 시세`];
  return { topic, keywords };
}

export function buildWeeklyDraftLink(history: WeeklySnap[], from: string, to: string, now = new Date(), target: DraftTarget = "blog") {
  const draft = buildWeeklyDraft(history, from, to, now);
  return draft ? draftLink(draft, target) : null;
}

// v1.37(추가개선 7): 실거래 자료가 이어서 없는 날수. 확장이 회원 PC에 「처음 없던 시각」을 기억한다(tradeMissing).
// 하루짜리는 이름 맞추기 실패일 수 있어 2일 이상일 때만 화면에 「최근 6개월 매매 신고 없음」을 보인다.
export const NO_TRADE_MIN_DAYS = 2;
export function noTradeDays(firstMissingAt: string | undefined, now = new Date()) {
  if (!firstMissingAt) return null;
  const t = new Date(firstMissingAt).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((now.getTime() - t) / (24 * 3600 * 1000)) + 1; // 처음 없던 날을 1일째로 센다
  return days >= NO_TRADE_MIN_DAYS ? days : null;
}
