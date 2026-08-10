"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { analyzeListingAction, type AnalysisActionState } from "@/lib/actions/analysis";
import { ANALYSIS_MODEL_OPTIONS, type AnalysisModel } from "@/lib/ai/models";

const initialState: AnalysisActionState = {};

export function AnalyzeButton({ listingId }: { listingId: string }) {
  const [model, setModel] = useState<AnalysisModel>("gpt-4o-mini");
  const [state, formAction, isPending] = useActionState(analyzeListingAction, initialState);

  return (
    <form action={formAction} className="glass-card space-y-3 p-4">
      <input type="hidden" name="listingId" value={listingId} />
      <label className="block text-sm font-medium text-neutral-300">AI 분석 모델</label>
      <select
        name="model"
        value={model}
        onChange={(e) => setModel(e.target.value as AnalysisModel)}
        className="w-full rounded-lg border border-white/10 bg-dark-100 px-3 py-2 text-sm text-neutral-100"
      >
        {ANALYSIS_MODEL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-neutral-500">
        본인이 설정에 등록한 OpenAI/Perplexity 키로 분석이 실행돼요. 모델에 따라 비용이 달라요.
      </p>
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-green-400">분석이 완료됐어요.</p>}
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "분석 중... (o3는 시간이 걸릴 수 있어요)" : "AI 분석하기"}
      </Button>
    </form>
  );
}
