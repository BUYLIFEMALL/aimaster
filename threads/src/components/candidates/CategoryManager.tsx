"use client";

import { useState } from "react";
import { CategoryManagementModal } from "./CategoryManagementModal";
import type { ThreadsCategory } from "@/types/post";

export function CategoryManager({ categories }: { categories: ThreadsCategory[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-900">🗂 카테고리 관리</p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100"
        >
          ⚙️ 카테고리 추가·수정·삭제
        </button>
      </div>
      {categories.length === 0 ? (
        <p className="text-xs text-neutral-500">
          등록된 카테고리가 없습니다. 위 버튼을 눌러 쓰레드 글감 수집에 사용할 카테고리를 만들어보세요.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <span key={cat.id} className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-600">
              {cat.name}
            </span>
          ))}
        </div>
      )}

      {isOpen && <CategoryManagementModal categories={categories} onClose={() => setIsOpen(false)} />}
    </div>
  );
}
