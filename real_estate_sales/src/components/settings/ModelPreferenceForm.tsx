"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  savePreferredModelAction,
  type PreferencesActionState,
} from "@/lib/actions/preferences";
import { ANALYSIS_MODEL_OPTIONS, type AnalysisModel } from "@/lib/ai/models";

const initialState: PreferencesActionState = {};

export function ModelPreferenceForm({
  currentModel,
}: {
  currentModel: AnalysisModel | null;
}) {
  const [model, setModel] = useState<AnalysisModel>(currentModel ?? "gpt-5.6-luna");
  const [state, formAction, isPending] = useActionState(savePreferredModelAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
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
      {state.error && <p className="text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="text-sm text-green-400">저장됐어요.</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "저장 중..." : "이 모델로 저장하기"}
      </Button>
    </form>
  );
}
