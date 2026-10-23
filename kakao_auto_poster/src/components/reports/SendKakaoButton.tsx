"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { sendReportToKakaoAction, type SendKakaoState } from "@/lib/actions/reports";

const initialState: SendKakaoState = {};

export function SendKakaoButton({ reportId }: { reportId: string }) {
  const [state, formAction, isPending] = useActionState(sendReportToKakaoAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="reportId" value={reportId} />
      <Button type="submit" disabled={isPending}>
        {isPending ? "발송 중..." : "💬 카카오로 발송"}
      </Button>
      {state.error && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-2 text-xs text-green-600">카카오톡으로 발송했습니다.</p>}
    </form>
  );
}
