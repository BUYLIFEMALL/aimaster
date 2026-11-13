"use client";

import { useInlineConfirm } from "@/app/inline-confirm";

// 비회원 주문 상태 버튼 — 취소·반품처럼 되돌리기 어려운 것은 한 번 더 묻는다(가입 손님 버튼과 같은 문구)
const CONFIRM: Record<string, string> = {
  cancelled: "이 주문을 취소할까요? 재고가 되돌려집니다.",
  cancel_requested: "취소를 요청할까요?",
  return_requested: "반품을 요청할까요?",
  confirmed: "구매를 확정할까요? 확정 뒤에는 취소·반품을 요청할 수 없습니다.",
};

export default function GuestStatusButton({ to, label, action }: { to: string; label: string; action: () => Promise<void> }) {
  const danger = to === "cancelled" || to === "cancel_requested" || to === "return_requested";
  const c = useInlineConfirm();
  return (
    <form action={action} onSubmit={c.guard(CONFIRM[to])}>
      <button className={`min-h-10 rounded px-4 text-sm ${danger ? "border border-red-200 text-red-700" : "bg-gray-900 text-white"}`}>{label}</button>
      {c.box}
    </form>
  );
}
