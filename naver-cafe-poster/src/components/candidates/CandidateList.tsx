"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  deleteCandidateAction,
  moveCandidatesToCategoryAction,
  setCandidateUseForScheduleAction,
  type MoveCandidatesState,
} from "@/lib/actions/candidates";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { CandidateScheduleToggleButton } from "@/components/candidates/CandidateScheduleToggleButton";
import { CANDIDATE_SOURCE_LABELS, type CafeCandidate, type CafeCategory, type CandidateSourceType } from "@/types/post";

interface CandidateListProps {
  candidates: CafeCandidate[];
  categories: CafeCategory[];
}

export function CandidateList({ candidates, categories }: CandidateListProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [moveCategoryId, setMoveCategoryId] = useState("");
  const [isMoving, startMoving] = useTransition();
  const [moveState, setMoveState] = useState<MoveCandidatesState | null>(null);

  const categoryName = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [categories]);

  const filtered =
    categoryFilter === "all"
      ? candidates
      : categoryFilter === "__none__"
        ? candidates.filter((c) => !c.category_id)
        : candidates.filter((c) => c.category_id === categoryFilter);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((c) => next.delete(c.id));
      } else {
        filtered.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function handleMove() {
    if (selected.size === 0) return;
    startMoving(async () => {
      const fd = new FormData();
      selected.forEach((id) => fd.append("ids", id));
      fd.set("categoryId", moveCategoryId);
      const result = await moveCandidatesToCategoryAction(fd);
      setMoveState(result);
      if (!result.error) setSelected(new Set());
    });
  }

  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        아직 수집된 게시글 후보가 없습니다. 위에서 방식을 선택해 첫 후보를 만들어보세요.
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-700">카테고리 필터</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900"
          >
            <option value="all">전체</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value="__none__">카테고리 없음</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs font-medium text-neutral-700">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-4 w-4" />
            전체 선택
          </label>
          <span className="text-xs text-neutral-600">{selected.size}건 선택됨</span>
          <select
            value={moveCategoryId}
            onChange={(e) => setMoveCategoryId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900"
          >
            <option value="">카테고리 없음</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" disabled={selected.size === 0 || isMoving} onClick={handleMove}>
            {isMoving ? "이동 중..." : "선택한 후보 이동"}
          </Button>
        </div>

        {moveState?.error && <span className="text-xs text-red-600">{moveState.error}</span>}
        {moveState?.count && !moveState.error && (
          <span className="text-xs text-emerald-600">{moveState.count}건을 이동했습니다.</span>
        )}
      </div>

      <ul className="space-y-3">
        {filtered.map((c) => {
          const writeParams = new URLSearchParams({ title: c.title });
          if (c.content) {
            writeParams.set("content", c.content);
          }
          return (
            <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="mt-1 h-4 w-4"
                    aria-label="이동할 후보 선택"
                  />
                  <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={setCandidateUseForScheduleAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="useForSchedule" value={String(!c.use_for_schedule)} />
                    <CandidateScheduleToggleButton on={c.use_for_schedule} />
                  </form>
                  <Link
                    href={`/drafts?${writeParams.toString()}`}
                    className="rounded-full bg-green-600 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-green-700"
                  >
                    이 후보로 초안 만들기
                  </Link>
                  <form action={deleteCandidateAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <DeleteButton variant="compact" />
                  </form>
                </div>
              </div>
              {categoryName(c.category_id) && (
                <div className="mb-2 ml-6">
                  <span className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-bold text-blue-700">
                    📁 {categoryName(c.category_id)}
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap text-sm text-neutral-700">{c.content}</p>
              {c.keywords && c.keywords.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.keywords.map((k) => (
                    <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                      #{k}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-neutral-400">
                {CANDIDATE_SOURCE_LABELS[c.source_type as CandidateSourceType]} · {c.source_input} ·{" "}
                {new Date(c.created_at).toLocaleString("ko-KR")}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
