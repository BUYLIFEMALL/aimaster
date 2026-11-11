"use client";

import { useActionState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { AI_MODELS } from "@/lib/aiQuote";
import { saveAiSettingsAction, type AiSettingsState } from "./ai-actions";

export type AiStatus = { hasKey: boolean; hint: string; model: string; minMargin: number };

// D27 AI 견적 보조(D29부터 「AI 도우미」 공통 키) — 몰 대표 본인 Anthropic 키로 견적 단가를 제안받는다(누를 때만, 자동 회신 없음)
export default function AiForm({ slug, status }: { slug: string; status: AiStatus }) {
  const initial: AiSettingsState = { error: null, message: null, model: status.model, minMargin: String(status.minMargin) };
  const [state, formAction, pending] = useActionState(saveAiSettingsAction.bind(null, slug), initial);

  return (
    <fieldset id="ai" className="scroll-mt-4 rounded-lg border p-4" data-ai-settings>
      <legend className="px-1 text-sm font-semibold">🤖 AI 도우미</legend>
      <p className="text-sm text-gray-600">키 하나로 아래 기능을 씁니다. 모두 누를 때만 부르고, 결과는 칸에 채워지기만 할 뿐 저장·회신·게시는 운영자님이 직접 합니다.</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
        <li>견적 상세 「AI 단가 제안」 — 판매가·거래처 단가·원가·재고·최근 구매 단가를 보고 품목별 단가와 이유(최소 마진 아래는 자동으로 올림)</li>
        <li>상품 등록·수정 「AI로 채우기」 — 메모와 대표 사진으로 상품 이름·한 줄 소개·설명·옵션 후보</li>
        <li>문의 「AI 답변 초안」 — 상품 정보·자주 묻는 질문·배송 정책으로 답변 초안</li>
        <li>첫 화면 「AI 초안 만들기」 — 업종 한 줄로 블록 배치 초안</li>
      </ul>
      <p className="mt-1 text-xs text-gray-500">최소 마진율은 「상품 › ⚠ 마진 점검」의 기준으로도 씁니다(이 점검은 AI를 부르지 않습니다).</p>
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
