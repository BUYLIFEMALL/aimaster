"use client";

import { useState } from "react";
import { createWatchlistAction } from "@/lib/actions/watchlist";
import { NAVER_TOP_CATEGORIES } from "@/lib/naver/categories";

export function WatchlistForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      const selectedName = NAVER_TOP_CATEGORIES.find((c) => c.code === formData.get("naverCategoryCode"))?.name ?? "";
      formData.set("categoryName", selectedName);

      const result = await createWatchlistAction(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        form.reset();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">카테고리</label>
        <select name="naverCategoryCode" required className="input">
          <option value="">카테고리를 선택하세요</option>
          {NAVER_TOP_CATEGORIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">추적할 키워드 (쉼표로 구분, 최대 10개)</label>
        <input
          name="keywords"
          type="text"
          placeholder="예: 캠핑의자, 무선청소기, 강아지방석"
          required
          className="input"
        />
        <p className="mt-1 text-xs text-gray-400">
          API 호출량 보호를 위해 한 번에 등록 가능한 키워드 수를 제한합니다.
        </p>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 text-white font-bold py-3 px-4 rounded-xl transition-all"
      >
        {isPending ? "등록 중..." : "관심 목록에 추가"}
      </button>
    </form>
  );
}
