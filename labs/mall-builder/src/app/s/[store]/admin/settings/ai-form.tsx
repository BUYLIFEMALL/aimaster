"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { AI_MODELS } from "@/lib/aiQuote";
import { saveAiSettingsAction, type AiSettingsState } from "./ai-actions";

export type AiStatus = { hasKey: boolean; hint: string; model: string; minMargin: number };

// D27 AI 견적 보조 — 몰 대표 본인 Anthropic 키로 견적 단가를 제안받는다(누를 때만, 자동 회신 없음)
export default function AiForm({ slug, status }: { slug: string; status: AiStatus }) {
  const initial: AiSettingsState = { error: null, message: null, model: status.model, minMargin: String(status.minMargin) };
  const [state, formAction, pending] = useActionState(saveAiSettingsAction.bind(null, slug), initial);

  return (
    <fieldset className="rounded-lg border p-4" data-ai-settings>
      <legend className="px-1 text-sm font-semibold">🤖 AI 견적 보조</legend>
      <p className="text-sm text-gray-600">
        견적 요청이 오면 견적 상세에서 「AI 단가 제안」을 눌러 품목별 단가와 이유를 받습니다. 판매가·이 거래처 지금 단가·원가·재고·최근 구매 단가를 보고 제안하며, 최소 마진율 아래 제안은 자동으로 올립니다. 제안은 회신 칸에 채워지기만 하고, 회신은 운영자님이 직접 누릅니다.
      </p>
      <p className="mt-2 text-sm" data-ai-status>
        상태 <b>{status.hasKey ? `키 등록됨(…${status.hint})` : "키 없음 — 아래에 등록해야 쓸 수 있습니다"}</b>
      </p>
      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm">운영자님 본인 Anthropic API 키(sk-ant-…) {status.hasKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}</span>
          <input name="api_key" type="password" autoComplete="off" maxLength={300} placeholder={status.hasKey ? "••••••••" : "sk-ant-로 시작"} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="block">
          <span className="text-sm">모델</span>
          <select name="model" defaultValue={state.model} className="mt-1 w-full rounded border px-3 py-2">
            {AI_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">최소 마진율(%)</span>
          <input name="min_margin" defaultValue={state.minMargin} inputMode="numeric" maxLength={2} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_key" /> 등록한 키 지우기
          </label>
        )}
        <div className="sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "AI 설정 저장"}</button>
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        비용은 운영자님 Anthropic 계정에서 빠집니다(견적 1건 10품목 기준 대략 가성비 1원 · 균형 30원 · 최고 품질 60원). 키는 서버에서 암호화해 저장되고 화면·브라우저로는 다시 나오지 않습니다. 키 발급: console.anthropic.com → API Keys.
      </p>
    </fieldset>
  );
}
