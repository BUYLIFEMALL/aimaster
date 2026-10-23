"use client";

import { useFormStatus } from "react-dom";
import { clsx } from "@/lib/clsx";

/**
 * 게시(deployDraftAction)는 토큰 갱신 + 네이버 API 호출이 겹치면 몇 초씩 걸릴 수 있는데,
 * 기존엔 평범한 <button>이라 누른 뒤 아무 시각적 반응이 없어 "버튼이 반응 없다"는 지적
 * (2026-09-12)을 받았다 — DeleteButton과 동일하게 useFormStatus로 진행 중 상태를 보여준다.
 */
export function DeployButton({
  className,
  label,
  pendingLabel = "게시 중...",
  disabled,
}: {
  className?: string;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={clsx("transition-colors disabled:cursor-not-allowed", className)}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
