"use client";

// 서버 동작 폼의 제출 단추 — 누르는 동안 잠기고 문구가 바뀐다(2026-11-12: 빠르게 두 번 눌러 「이미 요청한 주문」 오류·같은 배송지 두 번 저장이 생긴 일)
import { useFormStatus } from "react-dom";

export default function PendingButton({ children, pendingText = "처리 중…", className }: { children: React.ReactNode; pendingText?: string; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:opacity-50`}>
      {pending ? pendingText : children}
    </button>
  );
}
