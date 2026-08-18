"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFormSourceAction } from "@/lib/actions/sources";

export function SourceCreateForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await createFormSourceAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-semibold text-gray-700 mb-1">폼 이름</label>
        <input name="name" required placeholder="예: 수강상담 신청폼" className="input" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3 text-sm font-bold text-white hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 transition-all"
      >
        {isPending ? "추가 중..." : "+ 구글폼 연결 추가"}
      </button>
      {error && <p className="w-full text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}
