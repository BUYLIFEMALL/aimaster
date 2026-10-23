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
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3 bg-mx-surface border border-mx-border rounded-2xl p-4 shadow-sm">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-sm font-semibold text-mx-text mb-1">폼 이름</label>
        <input name="name" required placeholder="예: 수강상담 신청폼" className="input" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mx-btn-primary px-5"
      >
        {isPending ? "추가 중..." : "+ 구글폼 연결 추가"}
      </button>
      {error && <p className="w-full text-sm text-mx-danger bg-[#fff1f2] rounded-lg px-3 py-2">{error}</p>}
    </form>
  );
}
