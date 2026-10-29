// 연계 I(2026-10-29, 주인님 「이걸 하자」): 단지 시세 요약 → 「블로그 포스팅 자동화」 글쓰기 화면에 주제·키워드 미리 채우기.
// 블로그 쪽 입구는 이미 있다(`ai-auto-blog/app/write/ai-form/page.tsx`가 ?topic=·?keywords= 를 읽음) — 블로그 코드는 고치지 않는다.
// 넘기는 것은 단지 이름과 요약 숫자뿐(중개사·전화번호·매물 번호·동호수 없음). 회원이 버튼을 눌렀을 때만 주소로 넘어간다.

export const BLOG_WRITE_URL = "https://ai-auto-blog.buylife.xyz/write/ai-form";
const TOPIC_MAX = 120;

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

export function buildBlogDraftLink(stat: DraftStat, now = new Date()) {
  const { topic, keywords } = buildBlogDraft(stat, now);
  return `${BLOG_WRITE_URL}?${new URLSearchParams({ topic, keywords: keywords.join(",") }).toString()}`;
}
