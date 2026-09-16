"use client";

import { useState } from "react";
import { CategoryManagementModal } from "./CategoryManagementModal";
import type { CafeCategory } from "@/types/post";

/**
 * blog(BLOG 원문생성 자동화)의 카테고리 관리 패턴으로 교체(2026-09-16, 사용자 요청) — 예전엔
 * 카테고리 목록/추가폼이 이 박스 안에 항상 펼쳐져 있어 페이지 공간을 많이 차지했다. 이제는
 * 카테고리 이름 칩만 간단히 보여주고, 실제 추가·수정·삭제·순서변경은 팝업 모달
 * (CategoryManagementModal)에서 처리한다.
 */
export function CategoryManager({ categories }: { categories: CafeCategory[] }) {
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
          등록된 카테고리가 없습니다. 위 버튼을 눌러 글감 수집에 쓸 카테고리를 만들어보세요.
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
