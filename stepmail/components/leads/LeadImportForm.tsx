"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { importLeadsAction } from "@/lib/actions/leads";

export function LeadImportForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) {
        setError("엑셀 파일을 선택해주세요.");
        return;
      }
      const res = await importLeadsAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setResult(`${res.importedCount?.toLocaleString()}건 가져왔습니다.`);
        (e.target as HTMLFormElement).reset();
        router.refresh();
      }
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-800 mb-2">엑셀로 리드 가져오기</p>
      <p className="text-xs text-gray-500 mb-3">
        컬럼: 이메일(필수) / 닉네임 / 채널 / 상태(미발송, 1~5차 발송, 발송제외, 수신거부). 이미
        등록된 이메일은 최신 정보로 갱신됩니다.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="file"
          name="file"
          accept=".xlsx,.xls,.csv"
          required
          className="flex-1 min-w-[200px] text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
        />
        <a
          href="/api/leads/template"
          className="px-3 py-2 rounded-lg text-sm font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 whitespace-nowrap"
        >
          입력폼 다운로드
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-60"
        >
          {isPending ? "가져오는 중..." : "가져오기"}
        </button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        파일 1개당 최대 15MB까지 올릴 수 있어요 (대략 15만~20만 명 분량). 그보다 많으면 파일을
        나눠서 여러 번 올려주세요 — 누적 등록 건수에는 제한이 없습니다.
      </p>
      {result && <p className="mt-2 text-xs text-green-600">{result}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </form>
  );
}
