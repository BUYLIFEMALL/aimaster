"use client";

import { useMemo, useState } from "react";
import { deleteReviewRunAction, getReviewItemsAction, renameReviewRunAction, type ReviewItem, type ReviewRun } from "@/lib/actions/coupangResults";
import { sellerText, toCsv } from "@/extension/lib/parse.js";
import { MARKET_LABEL, type SourcingMarket } from "@/lib/coupangResults";

const when = (iso: string) => new Date(iso).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", timeStyle: "short" });
const runTitle = (run: ReviewRun) => run.label || run.keyword || "키워드 없음";

export function ReviewResults({ initialRuns, market = "coupang" }: { initialRuns: ReviewRun[]; market?: SourcingMarket }) {
  const naver = market === "naver";
  const label = MARKET_LABEL[market];
  const [runs, setRuns] = useState(initialRuns);
  const [selected, setSelected] = useState<ReviewRun | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [minReviews, setMinReviews] = useState(1);
  const [excludeAds, setExcludeAds] = useState(false);
  const [minPurchases, setMinPurchases] = useState(0);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const shown = useMemo(
    () => items.filter((item) => item.reviews >= minReviews && (item.purchases ?? 0) >= minPurchases && !(excludeAds && item.is_ad)),
    [items, minReviews, minPurchases, excludeAds],
  );

  async function open(run: ReviewRun) {
    setSelected(run);
    setLoading(true);
    setMessage("");
    const result = await getReviewItemsAction(run.id);
    setItems(result.items);
    if (result.error) setMessage(result.error);
    setLoading(false);
  }

  async function rename(run: ReviewRun, label: string) {
    if (label === (run.label ?? "")) return;
    const { error } = await renameReviewRunAction(run.id, label);
    if (error) return setMessage(error);
    setRuns((list) => list.map((r) => (r.id === run.id ? { ...r, label: label.trim() || null } : r)));
  }

  async function remove(run: ReviewRun) {
    const { error } = await deleteReviewRunAction(run.id);
    setConfirmId(null);
    if (error) return setMessage(error);
    setRuns((list) => list.filter((r) => r.id !== run.id));
    if (selected?.id === run.id) {
      setSelected(null);
      setItems([]);
    }
  }

  function download() {
    const csv = toCsv(shown.map((item) => ({ market, rank: item.sales_rank ?? undefined, name: item.name, price: item.price, reviews: item.reviews, purchases: item.purchases ?? 0, sellers: item.sellers ?? 0, mall: item.mall_name ?? "", isAd: item.is_ad, url: item.url })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${label}_상품소싱_${selected ? runTitle(selected) : "결과"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="mx-card p-5">
      <h2 className="text-sm font-bold text-mx-text">🗂 내 {label} 검색 기록</h2>
      <p className="mt-1 text-xs text-mx-muted">내 계정에만 보이고 어느 PC에서든 볼 수 있습니다. 저장한 날부터 1년 뒤 자동으로 지워집니다.</p>
      {message && <p className="mt-2 text-xs text-[#fca5a5]">{message}</p>}

      {!runs.length ? (
        <p className="mt-4 text-sm text-mx-muted">아직 저장된 기록이 없습니다. 확장을 연결한 뒤 {naver ? "네이버 쇼핑" : "쿠팡"} 검색 화면에서 「이 페이지 읽어 담기」를 누르거나 키워드 자동 검색을 써 보세요.</p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-[280px_1fr]">
          <ul className="max-h-[480px] space-y-2 overflow-y-auto">
            {runs.map((run) => (
              <li key={run.id} className={`rounded-lg border p-3 ${selected?.id === run.id ? "border-mx-primary bg-mx-raised" : "border-mx-border"}`}>
                <button type="button" onClick={() => open(run)} className="block w-full text-left">
                  <span className="block truncate text-sm font-semibold text-mx-text">{runTitle(run)}</span>
                  <span className="text-xs text-mx-muted">{when(run.created_at)} · {run.item_count}개</span>
                </button>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {confirmId === run.id ? (
                    <>
                      <button type="button" onClick={() => remove(run)} className="whitespace-nowrap text-xs font-bold text-[#fca5a5]">정말 삭제</button>
                      <button type="button" onClick={() => setConfirmId(null)} className="whitespace-nowrap text-xs text-mx-muted">취소</button>
                    </>
                  ) : (
                    <button type="button" onClick={() => setConfirmId(run.id)} className="whitespace-nowrap text-xs text-mx-muted hover:text-mx-text">삭제</button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="min-w-0">
            {!selected ? (
              <p className="text-sm text-mx-muted">왼쪽에서 기록을 고르면 결과가 나옵니다.</p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    key={selected.id}
                    defaultValue={selected.label ?? ""}
                    placeholder={`이름 붙이기 (${selected.keyword || "키워드 없음"})`}
                    maxLength={60}
                    onBlur={(event) => rename(selected, event.target.value)}
                    className="min-w-0 flex-1 rounded border border-mx-border bg-transparent px-2 py-1.5 text-sm text-mx-text"
                  />
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs text-mx-text">
                    리뷰
                    <input type="number" min={0} value={minReviews} onChange={(event) => setMinReviews(Math.max(0, Number(event.target.value) || 0))} className="w-16 rounded border border-mx-border bg-transparent px-1 py-1 text-mx-text" />
                    개 이상
                  </label>
                  {naver && (
                    <label className="flex items-center gap-1 whitespace-nowrap text-xs text-mx-text">
                      구매
                      <input type="number" min={0} value={minPurchases} onChange={(event) => setMinPurchases(Math.max(0, Number(event.target.value) || 0))} className="w-16 rounded border border-mx-border bg-transparent px-1 py-1 text-mx-text" />
                      개 이상
                    </label>
                  )}
                  <label className="flex items-center gap-1 whitespace-nowrap text-xs text-mx-text">
                    <input type="checkbox" checked={excludeAds} onChange={(event) => setExcludeAds(event.target.checked)} /> 광고 빼기
                  </label>
                  <button type="button" onClick={download} disabled={!shown.length} className="mx-btn-primary whitespace-nowrap px-3 py-2 text-xs font-bold disabled:opacity-50">⬇ CSV 받기</button>
                </div>
                <p className="mt-2 text-xs text-mx-muted">{loading ? "불러오는 중…" : `${items.length}개 중 ${shown.length}개`}</p>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left text-xs text-mx-text">
                    <thead><tr className="border-b border-mx-border text-mx-muted"><th className="whitespace-nowrap py-2 pr-2 text-right">순위</th><th className="py-2 pr-2">상품명</th><th className="whitespace-nowrap py-2 pr-2 text-right">판매가</th><th className="whitespace-nowrap py-2 text-right">리뷰</th>{naver && <th className="whitespace-nowrap py-2 pl-2 text-right">구매</th>}</tr></thead>
                    <tbody>
                      {shown.map((item) => (
                        <tr key={item.product_id} className="border-b border-mx-border/60">
                          <td className="whitespace-nowrap py-2 pr-2 text-right text-mx-muted">{item.sales_rank ?? "-"}</td>
                          <td className="py-2 pr-2"><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[#93c5fd] hover:underline">{item.is_ad ? `[광고] ${item.name}` : item.name}</a>{naver && <span className="block text-[11px] text-mx-muted">{sellerText({ market, sellers: item.sellers ?? 0, mall: item.mall_name ?? "" })}</span>}</td>
                          <td className="whitespace-nowrap py-2 pr-2 text-right">{item.price == null ? "-" : `${item.price.toLocaleString("ko-KR")}원`}</td>
                          <td className="whitespace-nowrap py-2 text-right">{item.reviews.toLocaleString("ko-KR")}</td>
                          {naver && <td className="whitespace-nowrap py-2 pl-2 text-right">{(item.purchases ?? 0).toLocaleString("ko-KR")}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
