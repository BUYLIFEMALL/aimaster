"use client";

import type { CafeCategory } from "@/types/post";

/** 예약 자동화 등록/수정 시 카테고리를 여러 개 선택할 수 있는 체크박스 그룹. */
export function CategoryCheckboxGroup({
  categories,
  selectedIds,
  onChange,
}: {
  categories: CafeCategory[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  if (categories.length === 0) return null;

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((v) => v !== id) : [...selectedIds, id]);
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-700">카테고리 (여러 개 선택 가능)</label>
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => (
          <label
            key={c.id}
            className={`flex cursor-pointer items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              selectedIds.includes(c.id)
                ? "border-blue-400 bg-blue-100 text-blue-800"
                : "border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="h-3.5 w-3.5"
            />
            {c.name}
          </label>
        ))}
      </div>
    </div>
  );
}
