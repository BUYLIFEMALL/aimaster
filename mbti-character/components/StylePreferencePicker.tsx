"use client";

import { useEffect, useState } from "react";
import { IMAGE_STYLES, STYLE_PREFERENCE_STORAGE_KEY } from "@/lib/imageStyles";
import { StyleButtonGrid } from "@/components/StyleButtonGrid";

/**
 * 랜딩 페이지에서 미리 원하는 캐릭터 스타일을 골라두면, 검사 결과 화면의
 * CharacterImageGenerator가 이 값을 이어받아 기본 선택값으로 쓴다(2026-09-14 사용자 요청).
 * 로그인 계정과 무관하게 이 브라우저에서의 취향 기억용이라 localStorage에만 저장한다.
 */
export function StylePreferencePicker() {
  const [styleId, setStyleId] = useState(IMAGE_STYLES[0].id);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STYLE_PREFERENCE_STORAGE_KEY);
      if (saved && IMAGE_STYLES.some((s) => s.id === saved)) setStyleId(saved);
    } catch {}
  }, []);

  function handleSelect(id: string) {
    setStyleId(id);
    try {
      localStorage.setItem(STYLE_PREFERENCE_STORAGE_KEY, id);
    } catch {}
  }

  return (
    <div className="mt-4">
      <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
        🎨 생성하고 싶은 캐릭터 스타일
      </label>
      <StyleButtonGrid selectedId={styleId} onSelect={handleSelect} />
    </div>
  );
}
