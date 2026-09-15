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
import type { CafeCategory } from "@/types/post";

const initialState: CategoryActionState = {};

function EditCategoryRow({ category, onCancel }: { category: CafeCategory; onCancel: () => void }) {
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

export function CategoryManager({ categories }: { categories: CafeCategory[] }) {
  const [state, formAction, isPending] = useActionState(createCategoryAction, initialState);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="mb-1 text-sm font-bold text-neutral-900">🗂 카테고리 관리</p>
      <p className="mb-3 text-xs text-neutral-500">
        카테고리를 만들어두면 글감 수집 시 어느 카테고리에 넣을지 고를 수 있고, 예약 자동화에서
        특정 카테고리의 후보만 골라 원하는 게시판에 자동 포스팅할 수 있습니다. 카테고리를
        삭제해도 그 카테고리로 분류돼 있던 후보는 삭제되지 않고 "카테고리 없음"으로 돌아갑니다.
      </p>

      {categories.length > 0 && (
        <ul className="mb-3 space-y-2">
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
                  <span className="ml-1 text-sm text-neutral-800">{cat.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingId(cat.id)}
                    className="text-xs text-neutral-600 hover:underline"
                  >
                    수정
                  </button>
                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={cat.id} />
                    <button type="submit" className="text-xs text-red-600 hover:underline">
                      삭제
                    </button>
                  </form>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      <form action={formAction} className="flex gap-2">
        <Input name="name" placeholder="새 카테고리 이름 (예: 다이어트)" required className="flex-1" />
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "추가 중..." : "추가"}
        </Button>
      </form>
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </div>
  );
}
