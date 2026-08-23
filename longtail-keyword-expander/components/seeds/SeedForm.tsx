"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSeedAction } from "@/lib/actions/seeds";

export function SeedForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createSeedAction(new FormData(e.currentTarget));
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
          placeholder="확장할 키워드 (예: AI 자동화)"
          required
          className="input flex-1 min-w-[200px]"
        />
        <select name="engine" defaultValue="naver" className="input-sm w-28">
          <option value="naver">네이버</option>
          <option value="google">구글</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-3 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isPending ? "추가 중..." : "+ 키워드 추가"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}
