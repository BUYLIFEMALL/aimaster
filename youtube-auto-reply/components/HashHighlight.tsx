"use client";

// 공용 기준 코드 `hash-highlight` — 주소의 #id(예: #media-<id>)에 해당하는 묶음을 잠깐 테두리로 강조.
// 대시보드 「검토를 기다리는 ○○」에서 넘어왔을 때 어디로 이동했는지 보이게 한다.
// 기준: instagram-comment-reply/components/HashHighlight.tsx — 사본은 직접 고치지 말고 기준 수정 후 `--sync`.
import { useEffect } from "react";

export function HashHighlight({ color, durationMs = 2000 }: { color: string; durationMs?: number }) {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const highlight = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const el = id ? document.getElementById(id) : null;
      if (!el) return;
      el.style.transition = "box-shadow 0.3s ease";
      el.style.boxShadow = `0 0 0 2px ${color}`;
      clearTimeout(timer);
      timer = setTimeout(() => {
        el.style.boxShadow = "";
      }, durationMs);
    };
    highlight();
    window.addEventListener("hashchange", highlight);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", highlight);
    };
  }, [color, durationMs]);
  return null;
}
