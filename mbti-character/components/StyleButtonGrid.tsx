"use client";

import { IMAGE_STYLES } from "@/lib/imageStyles";

/** 캐릭터 이미지 스타일 선택 버튼 그리드 — 랜딩 페이지(취향 저장용)와 결과 페이지(생성용) 양쪽에서 재사용한다. */
export function StyleButtonGrid({
  selectedId,
  onSelect,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {IMAGE_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
            selectedId === s.id
              ? "border-purple-400 bg-purple-600 text-white"
              : "border-[#2a1f4e] text-slate-400 hover:border-purple-500/60"
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}
