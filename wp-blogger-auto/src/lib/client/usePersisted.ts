"use client";
// 원고별 화면 선택값 기억(카테고리·발행 방식·예약 시각·이미지 수) — 저장 뒤 화면이 다시 그려져도 초기화되지 않게.
// 이 브라우저 탭에만(sessionStorage), 읽기·쓰기가 막혀도 화면은 기본값으로 정상 동작.
import { useEffect, useState } from "react";

export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const s = window.sessionStorage.getItem(key);
      if (s !== null) setValue(JSON.parse(s) as T);
    } catch { /* 저장소 막힘 — 기본값 사용 */ }
    setReady(true);
  }, [key]);
  useEffect(() => {
    if (!ready) return;
    try { window.sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* 무시 */ }
  }, [key, value, ready]);
  return [value, setValue] as const;
}
