"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import {
  deleteCandidateAction,
  moveCandidatesToCategoryAction,
  type MoveCandidatesState,
} from "@/lib/actions/candidates";
import { DeleteButton } from "@/components/posts/DeleteButton";
import type { ThreadsCandidate, ThreadsCategory } from "@/types/post";
import type { ThreadsSourceType } from "@/types/database.types";

const SOURCE_LABELS: Record<ThreadsSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

interface CandidateListProps {
  candidates: ThreadsCandidate[];
  categories: ThreadsCategory[];
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
        아직 수집된 게시글 주제가 없습니다. 위에서 방식을 선택해 첫 주제를 만들어보세요.
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-neutral-700">카테고리 필터</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-900"
          >
            <option value="all">전체 ({candidates.length}건)</option>
            {categories.map((c) => {
              const count = candidates.filter((item) => item.category_id === c.id).length;
              return (
                <option key={c.id} value={c.id}>
                  {c.name} ({count}건)
                </option>
              );
            })}
            <option value="__none__">
              카테고리 없음 ({candidates.filter((item) => !item.category_id).length}건)
            </option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs font-medium text-neutral-700">
            <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="h-4 w-4" />
            전체 선택
          </label>
          <span className="text-xs text-neutral-600">{selected.size}건 선택됨</span>
          <select
            value={moveCategoryId}
            onChange={(e) => setMoveCategoryId(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-900 outline-none focus:border-neutral-900"
          >
            <option value="">카테고리 없음</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" disabled={selected.size === 0 || isMoving} onClick={handleMove}>
            {isMoving ? "이동 중..." : "선택한 주제 이동"}
          </Button>
        </div>

        {moveState?.error && <span className="w-full text-xs text-red-600">{moveState.error}</span>}
        {moveState?.count && !moveState.error && (
          <span className="w-full text-xs text-emerald-600">{moveState.count}건의 주제를 카테고리로 이동했습니다.</span>
        )}
      </div>

      <ul className="space-y-3">
        {filtered.map((c) => {
          const writeParams = new URLSearchParams({ topic: c.title, candidateId: c.id });
          if (c.content) {
            writeParams.set("content", c.content);
          }
          if (c.keywords && c.keywords.length > 0) {
            writeParams.set("keywords", c.keywords.join(","));
          }
          const catName = categoryName(c.category_id);
          return (
            <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="mb-1 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleSelect(c.id)}
                    className="mt-1 h-4 w-4"
                    aria-label="이동할 주제 선택"
                  />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
                    {catName && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700">
                        📁 {catName}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/posts/new?${writeParams.toString()}`}
                    className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                  >
                    이 주제로 글쓰기
                  </Link>
                  <form action={deleteCandidateAction}>
                    <input type="hidden" name="id" value={c.id} />
                    <DeleteButton />
                  </form>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{c.content}</p>
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
                {SOURCE_LABELS[c.source_type]} · {c.source_input} · {new Date(c.created_at).toLocaleString("ko-KR")}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
