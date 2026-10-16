"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  reanalyzeListingAction,
  type AnalysisActionState,
} from "@/lib/actions/analysis";

const initialState: AnalysisActionState = {};

// first: 아직 분석 결과가 없을 때의 첫 실행 버튼(2026-10-17 v1.13 — 상세 화면 자동 분석 대신 회원이 직접 누른다)
export function ReanalyzeButton({ listingId, first = false }: { listingId: string; first?: boolean }) {
  const [state, formAction, isPending] = useActionState(reanalyzeListingAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <Button type="submit" variant={first ? "primary" : "secondary"} disabled={isPending}>
        {isPending ? "분석 중..." : first ? "🤖 AI 분석 실행" : "다시 분석하기"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-mx-danger">{state.error}</p>}
    </form>
  );
}
