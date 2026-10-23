"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createCategoryAction,
  renameCategoryAction,
  deleteCategoryAction,
  moveCategoryAction,
  type CategoryActionState,
} from "@/lib/actions/categories";
import type { ThreadsCategory } from "@/types/post";

const initialState: CategoryActionState = {};

interface Props {
  categories: ThreadsCategory[];
  onClose: () => void;
}

function EditCategoryRow({ category, onCancel }: { category: ThreadsCategory; onCancel: () => void }) {
  const [state, formAction, isPending] = useActionState(renameCategoryAction, initialState);
  const [name, setName] = useState(category.name);

  return (
    <li className="rounded-lg border border-neutral-300 bg-neutral-50 p-2">
      <form action={formAction} className="flex items-center gap-2">
        <input type="hidden" name="id" value={category.id} />
        <Input name="name" value={name} onChange={(e) => setName(e.target.value)} required className="flex-1" />
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          취소
        </Button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </li>
  );
}

export function CategoryManagementModal({ categories, onClose }: Props) {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-neutral-900/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🗂</span>
            <h3 className="text-base font-bold text-neutral-900">카테고리 관리</h3>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 text-sm font-bold text-neutral-500 transition-colors hover:bg-neutral-200"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <p className="text-xs text-neutral-500">
            카테고리를 만들어두면 Threads 글감 수집 시 어느 카테고리에 넣을지 선택할 수 있고,
            &quot;수집된 게시글 주제&quot; 목록에서 카테고리별로 필터링·이동해서 분류 관리할 수 있습니다.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">➕ 새 카테고리 추가</label>
            <form action={formAction} className="flex gap-2">
              <Input name="name" placeholder="새 카테고리 이름 (예: IT 트렌드, 리빙, 비즈니스)" required className="flex-1" />
              <Button type="submit" variant="secondary" disabled={isPending}>
                {isPending ? "추가 중..." : "추가"}
              </Button>
            </form>
            {state.error && <p className="text-xs text-red-600">{state.error}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-neutral-700">📋 현재 등록된 카테고리 목록 ({categories.length}개)</label>
            {categories.length === 0 ? (
              <div className="py-8 text-center text-xs font-medium text-neutral-400">
                등록된 카테고리가 없습니다.
              </div>
            ) : (
              <ul className="space-y-2">
                {categories.map((cat, index) =>
                  editingId === cat.id ? (
                    <EditCategoryRow key={cat.id} category={cat} onCancel={() => setEditingId(null)} />
                  ) : (
                    <li
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border border-neutral-200 p-2"
                    >
                      <div className="flex items-center gap-1">
                        <form action={moveCategoryAction}>
                          <input type="hidden" name="id" value={cat.id} />
                          <input type="hidden" name="direction" value="up" />
                          <button
                            type="submit"
                            disabled={index === 0}
                            className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="위로 이동"
                          >
                            ▲
                          </button>
                        </form>
                        <form action={moveCategoryAction}>
                          <input type="hidden" name="id" value={cat.id} />
                          <input type="hidden" name="direction" value="down" />
                          <button
                            type="submit"
                            disabled={index === categories.length - 1}
                            className="rounded px-1.5 py-0.5 text-xs text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="아래로 이동"
                          >
                            ▼
                          </button>
                        </form>
                        <span className="ml-1 text-sm font-medium text-neutral-800">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setEditingId(cat.id)}
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          수정
                        </button>
                        <form action={deleteCategoryAction}>
                          <input type="hidden" name="id" value={cat.id} />
                          <button type="submit" className="text-xs font-bold text-red-600 hover:underline">
                            삭제
                          </button>
                        </form>
                      </div>
                    </li>
                  ),
                )}
              </ul>
            )}
          </div>
        </div>

        <div className="flex justify-end border-t border-neutral-100 bg-neutral-50/50 px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-xl bg-neutral-800 px-5 py-2 text-xs font-bold text-white transition-colors hover:bg-neutral-900"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
