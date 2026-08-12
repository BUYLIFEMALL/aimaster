"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";

interface PublishButtonProps {
  disabled?: boolean;
}

// 게시 폼(form action)의 제출 버튼. 처리 중에는 비활성화 + "게시 중..." 표시로 바꿔서
// 클릭했는데 반응이 없는 것처럼 보여 사용자가 다시 클릭하는 것(중복 게시 원인)을 막는다.
export function PublishButton({ disabled }: PublishButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={disabled || pending}>
      {pending ? "게시 중..." : "지금 게시하기"}
    </Button>
  );
}
