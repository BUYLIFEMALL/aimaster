// 감시 화면 시세 요약 → 블로그·티스토리 글쓰기 화면에 주제·키워드 미리 채우기. 기준: realty-listing-alert/lib/blogDraft.ts
// 넘기는 것은 지역 이름과 요약 숫자뿐이고, 회원이 버튼을 눌렀을 때만 주소로 넘어간다.
export type DraftTarget = "blog" | "tistory";
export const DRAFT_TARGETS: Record<DraftTarget, { label: string; url: string }> = {
  blog: { label: "블로그 포스팅 자동화", url: "https://ai-auto-blog.buylife.xyz/write/ai-form" },
  tistory: { label: "티스토리 포스팅 자동화", url: "https://tistory-auto-blog.buylife.xyz/write/ai-form" },
};
export const isDraftTarget = (v: unknown): v is DraftTarget => v === "blog" || v === "tistory";

const TOPIC_MAX = 120;

export type DraftStat = {
  area: string; // 「역삼동」
  kind: string; // 「상가」
  total: number;
  events: { new: number; priceDown: number };
  saleAvg: number | null; // 매매 평균(만 원)
  saleN: number;
  gapMed: number | null; // 실거래 대비 중간값 %
};

function wonText(v: number) {
  const eok = Math.floor(v / 10000);
  const rest = Math.round(v % 10000);
  if (!eok) return `${rest.toLocaleString("ko-KR")}만 원`;
  return rest ? `${eok}억 ${rest.toLocaleString("ko-KR")}만 원` : `${eok}억 원`;
}

/** 이름 안에 전화번호처럼 보이는 긴 숫자가 섞여도 넘기지 않는다 */
const cleanName = (s: string) => String(s ?? "").replace(/\d{3,}[-\s]?\d{3,}[-\s]?\d{0,4}/g, "").replace(/\s+/g, " ").trim();

export function buildDraft(stat: DraftStat, now = new Date()) {
  const year = now.getFullYear();
  const area = cleanName(stat.area);
  const parts: string[] = [];
  if (stat.saleAvg != null && stat.saleN > 0) parts.push(`매매 호가 평균 ${wonText(stat.saleAvg)}`);
  if (stat.gapMed != null) parts.push(`실거래 대비 ${stat.gapMed > 0 ? "+" : ""}${stat.gapMed}%`);
  const moves = [stat.events.new ? `새 매물 ${stat.events.new}건` : "", stat.events.priceDown ? `가격 내림 ${stat.events.priceDown}건` : ""].filter(Boolean);
  if (moves.length) parts.push(moves.join("·"));
  let topic = `${year}년 ${now.getMonth() + 1}월 ${area} ${stat.kind} 매물 시세${parts.length ? ` — ${parts.join(", ")}` : ""}`;
  if (topic.length > TOPIC_MAX) topic = `${topic.slice(0, TOPIC_MAX - 1)}…`;
  const keywords = [`${area} ${stat.kind}`, `${area} ${stat.kind} 매매`, `${area} ${stat.kind} 시세`, `${year} ${stat.kind} 시세`];
  return { topic, keywords };
}

export function buildDraftLink(stat: DraftStat, target: DraftTarget, now = new Date()) {
  const d = buildDraft(stat, now);
  // 받는 쪽이 keywords를 쉼표로 나누므로 이름 안 쉼표는 「·」로 바꾼다
  return `${DRAFT_TARGETS[target].url}?${new URLSearchParams({ topic: d.topic, keywords: d.keywords.map((k) => k.replace(/\s*,\s*/g, "·")).join(",") }).toString()}`;
}
