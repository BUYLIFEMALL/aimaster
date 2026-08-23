"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createKeywordAction } from "@/lib/actions/keywords";

export function KeywordForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [engine, setEngine] = useState<"google" | "naver">("google");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createKeywordAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        (e.currentTarget as HTMLFormElement).reset();
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          name="keyword"
          placeholder="분석할 키워드 (예: AI 자동화)"
          required
          className="input flex-1 min-w-[200px]"
        />
        <select
          name="engine"
          value={engine}
          onChange={(e) => setEngine(e.target.value as "google" | "naver")}
          className="input-sm w-28"
        >
          <option value="google">구글</option>
          <option value="naver">네이버</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isPending ? "추가 중..." : "+ 키워드 추가"}
        </button>
      </div>

      {engine === "google" && (
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-xs font-semibold text-blue-600 hover:underline"
        >
          {showAdvanced ? "▲ 세부 옵션 닫기" : "▼ 세부 옵션 (지역/언어, 선택)"}
        </button>
      )}

      {engine === "google" && showAdvanced && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-gray-100 bg-gray-50/60 p-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">지역</label>
            <input name="location" defaultValue="South Korea" className="input-sm w-40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">구글 도메인</label>
            <input name="googleDomain" defaultValue="google.com" className="input-sm w-40" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">언어</label>
            <input name="lang" defaultValue="ko" className="input-sm w-24" />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}
