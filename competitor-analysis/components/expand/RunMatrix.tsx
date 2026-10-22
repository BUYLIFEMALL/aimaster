"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RunDeleteButton, RunListItem, type RunListItemProps } from "@/components/expand/RunListItem";
import { formatDateTime } from "@/lib/format";

type View = "table" | "grid";

// 실행 결과 목록 — 키워드 검색 + 표/카드 보기 전환 (스마트 매트릭스 스타일)
export function RunMatrix({ runs }: { runs: RunListItemProps[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("table");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? runs.filter((r) => r.keyword.toLowerCase().includes(q)) : runs;
  }, [runs, query]);

  return (
    <div className="mx-card p-4">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="🔎 키워드로 결과 찾기"
          className="input-sm md:max-w-xs"
          aria-label="키워드로 결과 찾기"
        />
        <div className="flex w-fit rounded-lg border border-mx-border p-0.5">
          <button type="button" onClick={() => setView("table")} className={`mx-toggle ${view === "table" ? "mx-toggle-active" : ""}`}>
            ☰ 표
          </button>
          <button type="button" onClick={() => setView("grid")} className={`mx-toggle ${view === "grid" ? "mx-toggle-active" : ""}`}>
            ▦ 카드
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-mx-muted">조건에 맞는 결과가 없습니다.</p>
      ) : view === "table" ? (
        <div className="-mx-4 overflow-x-auto px-4">
          <table className="mx-table min-w-[720px]">
            <thead>
              <tr>
                <th>키워드</th>
                <th>실행 시각</th>
                <th className="text-right">연관</th>
                <th className="text-right">롱테일</th>
                <th>작업 지시 미리보기</th>
                <th className="text-right">작업</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.runId}>
                  <td className="font-semibold">
                    <Link href={`/expand/${r.seedId}/runs/${r.runId}`} className="hover:text-[#93c5fd]">
                      {r.keyword}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap text-mx-muted">{formatDateTime(r.executedAt)}</td>
                  <td className="text-right tabular-nums">{r.relatedCount}</td>
                  <td className="text-right tabular-nums">{r.expansionCount}</td>
                  <td className="max-w-[280px]">
                    <p className="truncate text-xs text-mx-muted">{r.summaryPreview ?? "—"}</p>
                  </td>
                  <td className="text-right">
                    <RunDeleteButton seedId={r.seedId} runId={r.runId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => (
            <RunListItem key={r.runId} {...r} />
          ))}
        </div>
      )}
    </div>
  );
}
