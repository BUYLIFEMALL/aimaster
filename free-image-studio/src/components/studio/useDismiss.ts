"use client";

import { useEffect, useRef } from "react";
import { dismissStack, handleEscapeKey, type DismissEntry } from "@/lib/studio/dismissStack";

// Esc를 듣는 곳은 화면 전체에서 하나다. 열린 것이 여럿이어도 Esc 한 번에 맨 위 하나만 닫힌다.
let listening = false;
function onKey(e: KeyboardEvent) {
  // 열린 것이 없거나 Esc가 아니면 손대지 않는다. 누른 채 유지한 자동 반복은 삼키기만 하고 닫지 않는다.
  if (handleEscapeKey(dismissStack, e) !== "pass") e.stopPropagation();
}
function sync() {
  const want = dismissStack.size > 0;
  if (want === listening) return;
  listening = want;
  if (want) window.addEventListener("keydown", onKey);
  else window.removeEventListener("keydown", onKey);
}

/**
 * 확인 창·접는 메뉴의 키보드 처리.
 *  - 열려 있는 동안 Esc를 누르면 닫는다. **여러 개가 겹쳐 열려 있으면 가장 나중에 연 것 하나만** 닫는다.
 *  - 닫히면(취소·Esc·닫기 어느 쪽이든) **그것을 연 버튼으로만** 초점을 되돌린다 — 한 번 닫힐 때 한 번.
 * 돌려주는 ref를 여는 버튼에 단다. 닫힐 때 그 버튼이 화면에 없으면(작업이 끝나 안내가 사라진 경우 등) 아무것도 하지 않는다.
 */
export function useDismiss<T extends HTMLElement = HTMLButtonElement>(open: boolean, close: () => void) {
  const opener = useRef<T>(null);
  const wasOpen = useRef(false);
  const closeRef = useRef(close);
  closeRef.current = close;
  const entry = useRef<DismissEntry>({ close: () => closeRef.current() }).current;
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) {
        wasOpen.current = false;
        opener.current?.focus();
      }
      return;
    }
    wasOpen.current = true;
    dismissStack.push(entry);
    sync();
    return () => {
      dismissStack.remove(entry);
      sync();
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return opener;
}
