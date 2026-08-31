"use client";

import { useState } from "react";
import { findCandidatesAction, addCandidateToWatchlistAction, type CandidateItem } from "@/lib/actions/candidates";
import { NAVER_TOP_CATEGORIES } from "@/lib/naver/categories";

function scoreColor(score: number) {
  if (score >= 60) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (score >= 35) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-gray-50 text-gray-500 border-gray-200";
}

export function CandidateFinder() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [candidates, setCandidates] = useState<CandidateItem[] | null>(null);
  const [searchedSeed, setSearchedSeed] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryCode, setCategoryCode] = useState("");
  const [addedKeywords, setAddedKeywords] = useState<Set<string>>(new Set());

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCandidates(null);
    setSearchedSeed(null);
    setAddedKeywords(new Set());
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const selectedCode = String(formData.get("naverCategoryCode") ?? "");
      const selectedName = NAVER_TOP_CATEGORIES.find((c) => c.code === selectedCode)?.name ?? "";
      formData.set("categoryName", selectedName);
      setCategoryName(selectedName);
      setCategoryCode(selectedCode);

      const result = await findCandidatesAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setCandidates(result.candidates ?? []);
        setSearchedSeed(result.searchedSeed ?? null);
      }
    } finally {
      setIsPending(false);
    }
  }

  async function handleAdd(keyword: string) {
    const formData = new FormData();
    formData.set("categoryName", categoryName);
    formData.set("naverCategoryCode", categoryCode);
    formData.set("keyword", keyword);
    const result = await addCandidateToWatchlistAction(formData);
    if (!result.error) {
      setAddedKeywords((prev) => new Set(prev).add(keyword));
    }
  }

  return (
    <div className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-bold text-gray-900">카테고리로 후보 상품군 추천받기</h2>
        <p className="mt-1 text-xs text-gray-500">
          카테고리를 고르고, 그 카테고리를 대표하는 키워드를 1개 입력하면(예: &quot;청소기&quot;,
          &quot;캠핑용품&quot;) 네이버 검색광고 데이터로 연관 상품군을 자동으로 찾아드립니다. 검색량이
          많은데 경쟁이 낮은 후보를 우선 보여줍니다.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <select name="naverCategoryCode" required className="input-sm flex-1 min-w-[160px]">
            <option value="">카테고리 선택</option>
            {NAVER_TOP_CATEGORIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            name="seedKeyword"
            type="text"
            placeholder="대표 시드 키워드 (예: 청소기, 캠핑용품 — 띄어쓰기 없이)"
            required
            className="input-sm flex-1 min-w-[160px]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {isPending ? "찾는 중..." : "후보 찾기"}
          </button>
        </div>
      </form>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
        <p className="font-bold">⚠️ 시드 키워드 입력 시 주의사항</p>
        <p className="mt-0.5">
          네이버 검색광고 API는 <span className="font-bold">띄어쓰기가 하나라도 들어가면 요청 자체를
          거부</span>합니다. &quot;캠핑 의자&quot;처럼 띄어쓰기가 있으면 저희가 자동으로
          &quot;캠핑의자&quot;로 붙여서 검색하니 참고해주세요(검색 결과 상단에 실제로 검색된 키워드를
          보여드립니다).
        </p>
        <p className="mt-0.5">그 외에도 특수문자(!@#$% 등)가 섞이면 거부될 수 있으니, 가능하면 순수 한글/영문 단어로 입력해주세요.</p>
        <p className="mt-0.5">
          네이버 API 호출 한도(초당 몇 회) 때문에 짧은 시간에 여러 번 연속으로 누르면
          <span className="font-bold"> &quot;호출 한도를 초과했습니다&quot;</span> 에러가 날 수 있습니다 —
          이 경우 몇 초 후 다시 시도해주세요.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {searchedSeed && candidates && candidates.length > 0 && (
        <p className="text-xs text-gray-400">
          실제 검색어: <span className="font-mono font-semibold text-gray-600">{searchedSeed}</span>
        </p>
      )}

      {candidates && candidates.length === 0 && (
        <p className="text-sm text-gray-400">연관 키워드를 찾지 못했습니다. 다른 시드 키워드로 시도해보세요.</p>
      )}

      {candidates && candidates.length > 0 && (
        <div className="space-y-2">
          {candidates.map((c) => (
            <div key={c.keyword} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-semibold text-gray-900">{c.keyword}</p>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold rounded-full border px-2 py-0.5 ${scoreColor(c.candidateScore)}`}>
                    후보점수 {c.candidateScore}
                  </span>
                  <button
                    onClick={() => handleAdd(c.keyword)}
                    disabled={addedKeywords.has(c.keyword)}
                    className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                  >
                    {addedKeywords.has(c.keyword) ? "추가됨" : "관심 목록에 추가"}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                월간검색수 {c.totalMonthlySearches.toLocaleString()}건(PC {c.monthlyPcSearches.toLocaleString()}+모바일{" "}
                {c.monthlyMobileSearches.toLocaleString()})
                {c.competitionLevel && ` · 경쟁정도 ${c.competitionLevel}`}
                {c.trendChangePct != null && ` · 관심도 변화율 ${c.trendChangePct > 0 ? "+" : ""}${c.trendChangePct.toFixed(1)}%`}
              </p>
              {c.reason && <p className="mt-1 text-xs text-gray-700">{c.reason}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
