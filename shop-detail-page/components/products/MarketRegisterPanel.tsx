"use client";

import { useState, useTransition } from "react";
import { setProductReviewedAction } from "@/lib/actions/products";
import { MARKET_STATUS_LABEL, MARKETS, type MarketResult } from "@/lib/markets";

// 이커머스 한 흐름 4·5단계: 회원 최종 검토 → 마켓 자동 등록 화면으로 이동, 등록 결과 표시.
export function MarketRegisterPanel({
  productId,
  initialReviewedAt,
  results,
}: {
  productId: string;
  initialReviewedAt: string | null;
  results: MarketResult[];
}) {
  const [reviewedAt, setReviewedAt] = useState(initialReviewedAt);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const reviewed = Boolean(reviewedAt);

  const toggle = () => {
    setError(null);
    startTransition(async () => {
      const res = await setProductReviewedAction(productId, !reviewed);
      if (res.error) setError(res.error);
      else setReviewedAt(res.reviewedAt ?? null);
    });
  };

  return (
    <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">🛒 최종 검토 · 마켓 등록</h3>
          <p className="mt-1 text-xs text-slate-500">
            상세페이지·가격·이미지를 확인한 뒤 「검토 완료」를 누르고, 마켓 등록 화면에서 자동 입력을 보내세요.
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className={`rounded-xl border px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
            reviewed
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              : "border-slate-300 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
          }`}
        >
          {pending ? "저장 중…" : reviewed ? "✅ 검토 완료됨 (되돌리기)" : "✅ 검토 완료"}
        </button>
      </div>
      {reviewed && reviewedAt && (
        <p className="mt-2 text-[11px] text-emerald-700">
          검토 완료: {new Date(reviewedAt).toLocaleString("ko-KR")} — 이후 섹션을 바꿨다면 다시 확인해 주세요.
        </p>
      )}
      {error && <p className="mt-2 text-xs font-semibold text-rose-600">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {MARKETS.map((market) => {
          const result = results.find((r) => r.marketId === market.id);
          return (
            <div key={market.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-800">
                  {market.emoji} {market.name}
                </span>
                {result && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${MARKET_STATUS_LABEL[result.status].cls}`}
                  >
                    {MARKET_STATUS_LABEL[result.status].text}
                  </span>
                )}
              </div>
              {result && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {result.marketProductNo ? `상품번호 ${result.marketProductNo} · ` : ""}
                  {new Date(result.at).toLocaleString("ko-KR")}
                </p>
              )}
              {reviewed ? (
                <a
                  href={market.registerUrl(productId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  {market.name}에 등록하기 ↗
                </a>
              ) : (
                <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-center text-[11px] text-slate-500">
                  먼저 「검토 완료」를 눌러 주세요
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
