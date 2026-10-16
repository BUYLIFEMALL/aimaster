"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { saveAutoAnalyzeAction, type PreferencesActionState } from "@/lib/actions/preferences";

const initialState: PreferencesActionState = {};

// 2026-10-17 v1.14: "예약 조회" 새 실거래 알림에 AI 분석을 포함할지(본인 키 유료 호출) 회원이 고른다.
export function AutoAnalyzeForm({ enabled }: { enabled: boolean }) {
  const [checked, setChecked] = useState(enabled);
  const [state, formAction, isPending] = useActionState(saveAutoAnalyzeAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-xl border border-mx-border bg-dark-100 p-3">
        <input
          type="checkbox"
          name="autoAnalyze"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0"
        />
        <span className="text-sm text-mx-text">
          <span className="font-semibold">새 실거래 알림에 AI 분석 포함</span>
          <span className="mt-1 block text-mx-muted">
            켜 두면 알림을 보내기 전에 매물마다 AI 분석을 실행해 결과를 함께 보냅니다(본인 OpenAI·Perplexity 키 요금 발생).
            <br />
            끄면 알림에는 거래 정보만 담기고, 분석은 매물 상세 화면의 [AI 분석 실행] 버튼으로 필요한 것만 합니다.
          </span>
        </span>
      </label>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">저장됐어요.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "알림 설정 저장하기"}
      </Button>
    </form>
  );
}
