"use client";

import { useRef } from "react";
import { useInlineConfirm } from "@/app/inline-confirm";

// 지우기 전 화면 안 확인 상자 — 지운 사진은 되살릴 수 없다
export default function DeletePhotosButton() {
  const c = useInlineConfirm();
  const ref = useRef<HTMLButtonElement>(null);
  const confirmed = useRef(false);
  return (
    <>
      <button
        ref={ref}
        type="submit"
        onClick={(e) => {
          if (confirmed.current) {
            confirmed.current = false;
            return; // 확인 상자를 거친 두 번째 누름 → 그대로 보냄
          }
          const n = e.currentTarget.form?.querySelectorAll("input[name=name]:checked").length ?? 0;
          if (!n) return;
          e.preventDefault();
          c.ask(`고른 사진 ${n}장을 지웁니다. 지운 사진은 되살릴 수 없습니다. 지울까요?`, () => {
            confirmed.current = true;
            ref.current?.click();
          });
        }}
        className="mt-4 min-h-10 rounded bg-red-700 px-4 text-sm text-white"
      >
        고른 사진 지우기
      </button>
      {c.box}
    </>
  );
}
