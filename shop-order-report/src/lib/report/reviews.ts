// 내 상품 리뷰 분석(순수 함수, 무료) — 별점 분포·자주 나온 말·불만 문장. 남의 리뷰 대량 수집은 하지 않는다(쇼핑몰 묶음 §7).
import type { SheetData } from "@/lib/sheet";

export interface Review {
  rating: number | null;
  text: string;
  product: string;
}

const RATING_ALIASES = ["별점", "평점", "구매평점", "만족도", "rating", "점수"];
const TEXT_ALIASES = ["리뷰내용", "리뷰", "내용", "상품평", "후기", "review", "본문"];
const PRODUCT_ALIASES = ["상품명", "상품", "제품명"];

const findCol = (headers: string[], aliases: string[]) =>
  headers.find((h) => aliases.some((a) => h.replace(/\s/g, "").toLowerCase() === a)) ??
  headers.find((h) => aliases.some((a) => h.replace(/\s/g, "").toLowerCase().includes(a)));

export function reviewColumns(headers: string[]) {
  return { rating: findCol(headers, RATING_ALIASES), text: findCol(headers, TEXT_ALIASES), product: findCol(headers, PRODUCT_ALIASES) };
}

export function toReviews(sheet: SheetData, cols = reviewColumns(sheet.headers)): Review[] {
  if (!cols.text) return [];
  return sheet.rows
    .map((r) => {
      const raw = cols.rating ? String(r[cols.rating] ?? "") : "";
      const n = Number((/\d+(\.\d+)?/.exec(raw) ?? [""])[0]);
      return { rating: Number.isFinite(n) && n > 0 ? Math.min(5, n) : null, text: String(r[cols.text as string] ?? "").trim(), product: cols.product ? String(r[cols.product] ?? "").trim() : "" };
    })
    .filter((r) => r.text);
}

// 뜻이 약한 말(조사·감탄·흔한 말)은 세지 않는다
const STOP = new Set(["너무", "정말", "진짜", "그냥", "좀", "잘", "더", "또", "다", "이", "그", "저", "것", "거", "수", "제품", "상품", "구매", "주문", "배송", "합니다", "있어요", "했어요", "해요", "입니다", "같아요", "좋아요", "좋네요", "좋습니다", "있습니다", "없어요", "하고", "해서", "에서", "으로", "그리고", "근데", "많이", "조금", "아주", "완전", "생각", "사용", "받았어요", "받았습니다"]);
const SUFFIX = /(은|는|이|가|을|를|에|의|도|만|와|과|로|으로|에서|에게|까지|부터|이랑|랑|요|네요|어요|아요|습니다|해요|했어요|이에요|예요)$/;

export function tokenize(text: string): string[] {
  return text
    .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(SUFFIX, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

export function topWords(reviews: Review[], limit = 20): { word: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const r of reviews) for (const w of new Set(tokenize(r.text))) counts.set(w, (counts.get(w) ?? 0) + 1);
  return [...counts.entries()].map(([word, count]) => ({ word, count })).sort((a, b) => b.count - a.count || a.word.localeCompare(b.word)).slice(0, limit);
}

const NEGATIVE = /(별로|실망|불만|느려|늦게|늦어|파손|깨져|찢어|불량|냄새|작아요|커요|안 ?맞|환불|반품|교환|다르|차이|아쉽|아쉬|비싸|약해|새요|샜|흠집|얼룩|헐거|불편)/;

export function ratingDistribution(reviews: Review[]): { star: number; count: number }[] {
  return [5, 4, 3, 2, 1].map((star) => ({ star, count: reviews.filter((r) => r.rating != null && Math.round(r.rating) === star).length }));
}

/** 불만 리뷰 — 별점 2 이하이거나 불만 단어가 있는 것(최대 limit개, 낮은 별점 먼저). */
export function complaints(reviews: Review[], limit = 30): Review[] {
  return reviews
    .filter((r) => (r.rating != null && r.rating <= 2) || NEGATIVE.test(r.text))
    .sort((a, b) => (a.rating ?? 3) - (b.rating ?? 3))
    .slice(0, limit);
}

export function averageRating(reviews: Review[]): number | null {
  const rs = reviews.map((r) => r.rating).filter((v): v is number => v != null);
  return rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 100) / 100 : null;
}
