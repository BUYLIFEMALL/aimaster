"use client";

// E2-1 등록 정보 도우미 — 지금 거른 검색 표본으로 상품명 낱말·가격대·광고 비율을 보여 주고,
// 회원 본인 검색광고 키로 연관 키워드·월간 검색수를 불러온다. AI·새 수집 없음.
import { useMemo, useState } from "react";
import { adShare, priceStats, topWords, usedInNames, type SampleItem } from "@/lib/registerHelper";
import { relatedKeywordsAction } from "@/lib/actions/registerHelper";
import type { RelatedKeyword } from "@/lib/naver/searchAd";
import type { ListingMarket } from "@/lib/listingRules";
import { ListingDraft } from "@/components/coupang/ListingDraft";

const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;
const num = (n: number) => n.toLocaleString("ko-KR");

export function RegisterHelper({ items, keyword, collectedAt, market }: { items: SampleItem[]; keyword: string; collectedAt: string; market: ListingMarket }) {
  const names = useMemo(() => items.map((item) => item.name), [items]);
  const words = useMemo(() => topWords(names), [names]);
  const prices = useMemo(() => priceStats(items.map((item) => item.price)), [items]);
  const ads = useMemo(() => adShare(items), [items]);
  const [seed, setSeed] = useState(keyword);
  const [related, setRelated] = useState<RelatedKeyword[] | null>(null);
  const [message, setMessage] = useState("");
  const [needsKey, setNeedsKey] = useState(false);
  const [loading, setLoading] = useState(false);

  async function loadRelated() {
    setLoading(true);
    setMessage("");
    setNeedsKey(false);
    const result = await relatedKeywordsAction(seed);
    setLoading(false);
    if (result.error) {
      setMessage(result.error);
      setNeedsKey(Boolean(result.needsKey));
      return;
    }
    setRelated(result.keywords ?? []);
  }

  if (!items.length) return null;

  return (
    <section className="mt-5 rounded-lg border border-mx-border p-4">
      <h3 className="text-sm font-bold text-mx-text">📊 등록 정보 도우미</h3>
      <p className="mt-1 text-xs text-mx-muted">
        지금 거른 상품 {num(items.length)}개 기준 · 조사 {collectedAt} · 상품명·태그를 정할 때 참고하세요. 같은 검색 화면의 표본이라 시장 전체와 다를 수 있습니다.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-mx-raised p-3">
          <p className="text-xs font-bold text-mx-text">🔤 상품명에 많이 쓰인 낱말</p>
          {words.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {words.map((w) => (
                <span key={w.word} title={`${num(w.count)}개 상품명에 들어 있음`} className="rounded border border-mx-border px-1.5 py-0.5 text-[11px] text-mx-text">
                  {w.word} <span className="text-mx-muted">{w.pct}%</span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-mx-muted">두 번 이상 나온 낱말이 없습니다.</p>
          )}
        </div>

        <div className="rounded-lg bg-mx-raised p-3">
          <p className="text-xs font-bold text-mx-text">💰 가격대 · 📢 광고</p>
          {prices ? (
            <dl className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px]">
              {[["최저", prices.min], ["하위 25%", prices.q1], ["가운데", prices.median], ["상위 25%", prices.q3], ["최고", prices.max]].map(([label, value]) => (
                <div key={label as string}>
                  <dt className="text-mx-muted">{label}</dt>
                  <dd className="font-semibold text-mx-text">{won(value as number)}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-2 text-xs text-mx-muted">가격이 있는 상품이 없습니다.</p>
          )}
          <p className="mt-2 text-xs text-mx-text">
            광고 {num(ads.ads)}개 / {num(ads.total)}개 ({ads.pct}%){ads.pct >= 30 ? " — 광고가 많은 키워드라 광고비 경쟁이 셀 수 있습니다." : ""}
          </p>
          {prices && <p className="mt-1 text-[11px] text-mx-muted">가격이 있는 {num(prices.count)}개 기준</p>}
        </div>
      </div>

      <div className="mt-3 rounded-lg bg-mx-raised p-3">
        <p className="text-xs font-bold text-mx-text">🔎 연관 키워드 · 월간 검색수 (네이버 검색광고, 내 키)</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            value={seed}
            onChange={(event) => setSeed(event.target.value)}
            maxLength={40}
            placeholder="기준 키워드 (예: 캠핑의자)"
            className="min-w-0 flex-1 rounded border border-mx-border bg-transparent px-2 py-1.5 text-sm text-mx-text"
          />
          <button type="button" onClick={loadRelated} disabled={loading || !seed.trim()} className="mx-btn-primary whitespace-nowrap px-3 py-2 text-xs font-bold disabled:opacity-50">
            {loading ? "불러오는 중…" : "연관 키워드 불러오기"}
          </button>
        </div>
        <p className="mt-1 text-[11px] text-mx-muted">무료지만 내 검색광고 계정의 하루 호출 한도를 씁니다. 띄어쓰기는 자동으로 붙여서 찾습니다.</p>
        {message && (
          <p className="mt-2 text-xs text-[#fca5a5]">
            {message}
            {needsKey && (
              <>
                {" "}
                <a href="/settings" className="font-bold text-[#93c5fd] hover:underline">설정으로 가기</a>
              </>
            )}
          </p>
        )}
        {related && !related.length && <p className="mt-2 text-xs text-mx-muted">검색수가 있는 연관 키워드가 없습니다.</p>}
        {related && related.length > 0 && (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs text-mx-text">
              <thead>
                <tr className="border-b border-mx-border text-mx-muted">
                  <th className="py-2 pr-2">키워드</th>
                  <th className="whitespace-nowrap py-2 pr-2 text-right">월간 검색(PC+모바일)</th>
                  <th className="whitespace-nowrap py-2 pr-2 text-right">모바일</th>
                  <th className="whitespace-nowrap py-2 pr-2">경쟁</th>
                  <th className="whitespace-nowrap py-2 text-right">표본 상품명 사용</th>
                </tr>
              </thead>
              <tbody>
                {related.map((r) => {
                  const used = usedInNames(r.keyword, names);
                  return (
                    <tr key={r.keyword} className="border-b border-mx-border/60">
                      <td className="py-1.5 pr-2">{r.keyword}</td>
                      <td className="whitespace-nowrap py-1.5 pr-2 text-right">{num(r.totalMonthlySearches)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-2 text-right">{num(r.monthlyMobileSearches)}</td>
                      <td className="whitespace-nowrap py-1.5 pr-2">{r.competitionLevel ?? "-"}</td>
                      <td className={`whitespace-nowrap py-1.5 text-right ${used ? "" : "text-[#86efac]"}`} title={used ? "" : "검색은 되는데 표본 상품명에는 없는 낱말 — 상품명 후보로 살펴볼 만합니다"}>
                        {used ? `${num(used)}개` : "없음"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-1 text-[11px] text-mx-muted">「&lt; 10」으로 나오는 검색수는 5로 계산합니다. 초록 「없음」은 검색은 되는데 표본 상품명에는 없는 낱말입니다.</p>
          </div>
        )}
      </div>

      <ListingDraft
        market={market}
        keyword={seed.trim() || keyword}
        words={words.map((w) => w.word)}
        related={(related ?? []).map((r) => ({ keyword: r.keyword, searches: r.totalMonthlySearches, usedInSample: usedInNames(r.keyword, names) }))}
        priceMedian={prices?.median ?? null}
        names={names}
      />
    </section>
  );
}
