"use client";

import { useEffect, useRef } from "react";

/**
 * 확인 창·접는 메뉴의 키보드 처리.
 *  - 열려 있는 동안 Esc를 누르면 닫는다.
 *  - 닫히면(취소·Esc·닫기 어느 쪽이든) **연 버튼으로 초점을 되돌린다** — 키보드 사용자가 화면 맨 위로 튕겨 나가지 않게.
 * 돌려주는 ref를 여는 버튼에 단다. 닫힐 때 그 버튼이 화면에 없으면(작업이 끝나 안내가 사라진 경우 등) 아무것도 하지 않는다.
 */
export function useDismiss<T extends HTMLElement = HTMLButtonElement>(open: boolean, close: () => void) {
  const opener = useRef<T>(null);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        opener.current?.focus();
      }
      return;
    }
    wasOpen.current = true;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return opener;
}
