"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { savePropertyTypesAction, type PreferencesActionState } from "@/lib/actions/preferences";
import { DEAL_TYPES, PROPERTY_TYPES } from "@/lib/publicdata/molit";

const initialState: PreferencesActionState = {};

// 2026-10-31 v1.31: 새 실거래 알림·목록에 넣을 유형. 체크박스는 AutoAnalyzeForm처럼 비제어
export function PropertyTypesForm({ selected, deals }: { selected: readonly string[]; deals: readonly string[] }) {
  const [state, formAction, isPending] = useActionState(savePropertyTypesAction, initialState);
  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PROPERTY_TYPES.map((t) => (
          <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-mx-border bg-dark-100 px-4 text-sm text-mx-text">
            <input type="checkbox" name="propertyTypes" value={t} defaultChecked={selected.includes(t)} className="h-5 w-5" />
            {t}
          </label>
        ))}
      </div>
      <p className="text-sm text-mx-muted">하나도 고르지 않으면 전체를 받아요. 이미 받은 실거래는 그대로 남아요.</p>
      <div className="flex flex-wrap gap-2">
        {DEAL_TYPES.map((t) => (
          <label key={t} className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-mx-border bg-dark-100 px-4 text-sm text-mx-text">
            <input type="checkbox" name="dealTypes" value={t} defaultChecked={deals.includes(t)} className="h-5 w-5" />
            {t}
          </label>
        ))}
      </div>
      <p className="text-sm text-mx-muted">기본은 매매만이에요. 전세·월세를 켜면 건수가 많아 알림이 늘 수 있어요. 전세·월세에는 AI 투자 분석이 돌지 않아요(요금 없음).</p>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">저장됐어요.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "받을 유형·거래 저장하기"}
      </Button>
    </form>
  );
}
