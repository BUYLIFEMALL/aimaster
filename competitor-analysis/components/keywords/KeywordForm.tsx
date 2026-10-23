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
    // React 이벤트의 currentTarget은 await 이후에는 유지되지 않는다.
    const form = e.currentTarget;
    setError(null);
    setIsPending(true);
    try {
      const result = await createKeywordAction(new FormData(form));
      if (result.error) {
        setError(result.error);
      } else {
        form.reset();
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-card space-y-3">
      <p className="text-sm font-bold text-mx-text">🔍 새 키워드</p>
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
          className="input-sm min-h-[48px] w-28"
        >
          <option value="google">구글</option>
          <option value="naver">네이버</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="mx-btn-primary min-h-[48px] px-5"
        >
          {isPending ? "추가 중..." : "+ 키워드 추가"}
        </button>
      </div>

      {engine === "google" && (
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="min-h-[36px] text-xs font-semibold text-[#93c5fd] hover:underline"
        >
          {showAdvanced ? "▲ 세부 옵션 닫기" : "▼ 세부 옵션 (지역/언어, 선택)"}
        </button>
      )}

      {engine === "google" && showAdvanced && (
        <div className="flex flex-wrap gap-3 rounded-xl border border-mx-border bg-mx-raised p-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-mx-muted">지역</label>
            <input name="location" defaultValue="South Korea" className="input-sm w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mx-muted">구글 도메인</label>
            <input name="googleDomain" defaultValue="google.com" className="input-sm w-40" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-mx-muted">언어</label>
            <input name="lang" defaultValue="ko" className="input-sm w-24" />
          </div>
        </div>
      )}

      {error && <p className="rounded-lg border border-mx-danger px-3 py-2 text-sm text-mx-danger">{error}</p>}
    </form>
  );
}
