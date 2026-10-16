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
    <form onSubmit={handleSubmit} className="mx-card space-y-3">
      <p className="text-sm font-bold text-mx-text">🌱 새 씨드 키워드</p>
      <div className="flex flex-wrap gap-2">
        <input
          name="keyword"
          placeholder="확장할 키워드 (예: AI 자동화)"
          required
          className="input flex-1 min-w-[200px]"
        />
        <select name="engine" defaultValue="naver" className="input-sm min-h-[48px] w-28">
          <option value="naver">네이버</option>
          <option value="google">구글</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="mx-btn-primary min-h-[48px] px-5"
        >
          {isPending ? "추가 중..." : "+ 키워드 추가"}
        </button>
      </div>
      {error && <p className="rounded-lg border border-mx-danger px-3 py-2 text-sm text-mx-danger">{error}</p>}
    </form>
  );
}
