"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  reanalyzeListingAction,
  type AnalysisActionState,
} from "@/lib/actions/analysis";

const initialState: AnalysisActionState = {};

export function ReanalyzeButton({ listingId }: { listingId: string }) {
  const [state, formAction, isPending] = useActionState(reanalyzeListingAction, initialState);

  return (
    <form action={formAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <Button type="submit" variant="secondary" disabled={isPending}>
        {isPending ? "분석 중..." : "다시 분석하기"}
      </Button>
      {state.error && <p className="mt-1 text-xs text-red-400">{state.error}</p>}
    </form>
  );
}
