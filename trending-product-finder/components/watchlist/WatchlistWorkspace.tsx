"use client";

import { useState } from "react";
import { CandidateFinder } from "./CandidateFinder";
import { WatchlistForm } from "./WatchlistForm";
import { WatchlistRow } from "./WatchlistRow";
import type { WatchlistEntry } from "@/lib/actions/watchlist";

interface WatchlistWorkspaceProps {
  initialEntries: WatchlistEntry[];
}

/**
 * 관심 목록 화면 전체의 클라이언트 쪽 진실 공급원(source of truth).
 * 후보 추천/직접 등록/토글/삭제 전부 서버 액션이 돌려준 최신 entry로 이 상태를
 * 그 자리에서 갱신한다 — Next.js의 revalidatePath 타이밍에 의존하지 않아서
 * "저장은 됐는데 화면엔 안 보인다" 류의 지연/누락이 생기지 않는다.
 */
export function WatchlistWorkspace({ initialEntries }: WatchlistWorkspaceProps) {
  const [entries, setEntries] = useState<WatchlistEntry[]>(initialEntries);

  function upsertEntry(entry: WatchlistEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id);
      if (idx === -1) return [entry, ...prev];
      const next = [...prev];
      next[idx] = entry;
      return next;
    });
  }

  function removeEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <>
      <section>
        <CandidateFinder onEntryUpserted={upsertEntry} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-gray-900">직접 키워드 등록</h2>
        <WatchlistForm onCreated={upsertEntry} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900">등록된 관심 목록</h2>
        {!entries.length && <p className="text-sm text-gray-400">아직 등록된 관심 목록이 없습니다.</p>}
        {entries.map((entry) => (
          <WatchlistRow key={entry.id} entry={entry} onUpdated={upsertEntry} onDeleted={removeEntry} />
        ))}
      </section>
    </>
  );
}
