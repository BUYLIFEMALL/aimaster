"use client";

import { useActionState, useState } from "react";
import { noResetSubmit } from "@/lib/no-reset-submit";
import { AI_PROVIDERS, defaultModelOf, modelsOf, type AiModelId, type AiProviderId } from "@/lib/aiQuote";
import { saveAiSettingsAction, type AiSettingsState } from "./ai-actions";

export type AiStatus = {
  hasKey: boolean; // 몰 안에 저장한 키(Lab·배포 키트)
  hint: string;
  provider: AiProviderId;
  keyProvider: AiProviderId; // 몰 안에 저장한 키의 제공자
  model: AiModelId;
  minMargin: number;
  shared: Record<AiProviderId, boolean> | null; // 운영(AIMaster): 메인 사이트에 등록한 몰 대표 키가 있는지(값 없음)
};

const MAIN_KEYS_URL = "https://www.buylife.xyz/api-settings";

// AI 도우미 설정 — 제공자(OpenAI → Claude → Gemini)와 모델을 고른다(2026-11-12). 누를 때만 부르고 자동 회신·게시 없음.
export default function AiForm({ slug, status }: { slug: string; status: AiStatus }) {
  const initial: AiSettingsState = { error: null, message: null, provider: status.provider, model: status.model, minMargin: String(status.minMargin) };
  const [state, formAction, pending] = useActionState(saveAiSettingsAction.bind(null, slug), initial);
  const [provider, setProvider] = useState<AiProviderId>(status.provider);
  const [model, setModel] = useState<string>(status.model);
  const info = AI_PROVIDERS.find((p) => p.id === provider)!;
  const shared = status.shared;
  const ownKey = status.hasKey && status.keyProvider === provider;
  const ready = shared ? shared[provider] : ownKey;

  const pickProvider = (p: AiProviderId) => {
    setProvider(p);
    setModel(defaultModelOf(p)); // 제공자를 바꾸면 그 제공자의 기본 모델로
  };

  return (
    <fieldset id="ai" className="scroll-mt-4 rounded-lg border p-4" data-ai-settings>
      <legend className="px-1 text-sm font-semibold">🤖 AI 도우미 · {info.label}</legend>
      <p className="text-sm text-gray-600">고른 AI 하나로 아래 기능을 씁니다. 모두 누를 때만 부르고, 결과는 칸에 채워지기만 할 뿐 저장·회신·게시는 운영자님이 직접 합니다.</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-gray-600">
        <li>견적 상세 「AI 단가 제안」 — 판매가·거래처 단가·원가·재고·최근 구매 단가를 보고 품목별 단가와 이유(최소 마진 아래는 자동으로 올림)</li>
        <li>상품 등록·수정 「AI로 채우기」 — 메모와 대표 사진으로 상품 이름·한 줄 소개·설명·옵션 후보</li>
        <li>문의 「AI 답변 초안」 — 상품 정보·자주 묻는 질문·배송 정책으로 답변 초안</li>
        <li>첫 화면 「AI 초안 만들기」 — 업종 한 줄로 블록 배치 초안</li>
      </ul>
      <p className="mt-1 text-xs text-gray-500">최소 마진율은 「상품 › ⚠ 마진 점검」의 기준으로도 씁니다(이 점검은 AI를 부르지 않습니다).</p>

      <form onSubmit={noResetSubmit(formAction)} className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2" role="radiogroup" aria-label="AI 제공자">
          <span className="text-sm">AI 제공자</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {AI_PROVIDERS.map((p) => (
              <label key={p.id} className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded border px-3 py-2 text-sm ${provider === p.id ? "border-gray-900 bg-gray-900 text-white" : "bg-white"}`}>
                <input type="radio" name="provider" value={p.id} checked={provider === p.id} onChange={() => pickProvider(p.id)} className="sr-only" />
                {p.label}
                {shared && <span className={provider === p.id ? "text-green-300" : shared[p.id] ? "text-green-700" : "text-gray-400"}>{shared[p.id] ? "●" : "○"}</span>}
              </label>
            ))}
          </div>
        </div>

        <p className="text-sm sm:col-span-2" data-ai-status>
          상태{" "}
          <b>
            {shared
              ? shared[provider]
                ? `메인 사이트에 등록한 ${info.label} 키 사용`
                : `${info.label} 키 없음 — 메인 사이트에 등록해야 쓸 수 있습니다`
              : ownKey
                ? `${info.label} 키 등록됨(…${status.hint})`
                : `${info.label} 키 없음 — 아래에 등록해야 쓸 수 있습니다`}
          </b>
        </p>
        {shared && (
          <p className="text-xs text-gray-500 sm:col-span-2">
            키는 메인 사이트 「API키등록·플랫폼연동」에 한 번 등록하면 모든 AIMaster 프로그램에서 함께 씁니다(몰 대표 본인 키).{" "}
            <a href={MAIN_KEYS_URL} target="_blank" rel="noreferrer" className="underline">키 등록하러 가기 ↗</a>
          </p>
        )}

        {!shared && (
          <label className="block sm:col-span-2">
            <span className="text-sm">
              운영자님 본인 {info.label} API 키({info.keyHint}…) {ownKey && <span className="text-green-700">(등록됨 — 바꿀 때만 입력)</span>}
              {status.hasKey && !ownKey && <span className="text-amber-700"> — 지금 저장된 키는 다른 제공자 것이라 새로 넣어야 합니다</span>}
            </span>
            <input name="api_key" type="password" autoComplete="off" maxLength={300} placeholder={ownKey ? "••••••••" : `${info.keyHint}로 시작`} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
        )}

        <label className="block">
          <span className="text-sm">모델</span>
          <select name="model" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full rounded border px-3 py-2">
            {modelsOf(provider).map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm">최소 마진율(%)</span>
          <input name="min_margin" defaultValue={state.minMargin} inputMode="numeric" maxLength={2} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        {!shared && status.hasKey && (
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="remove_key" /> 등록한 키 지우기
          </label>
        )}
        <div className="sm:col-span-2">
          <button disabled={pending} className="min-h-11 rounded bg-gray-900 px-5 py-2 text-white disabled:opacity-50">{pending ? "저장 중…" : "AI 설정 저장"}</button>
          {!ready && <span className="ml-3 text-xs text-amber-700">키가 없으면 저장은 되지만 AI 단추를 누를 때 등록 안내가 나옵니다.</span>}
        </div>
      </form>
      {state.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      {state.message && <p className="mt-2 text-sm text-green-700">{state.message}</p>}
      <p className="mt-3 text-xs text-gray-500">
        비용은 운영자님 {info.label} 계정에서 빠집니다(누를 때마다, 결과 옆에 대략 금액 표시). 가성비 모델은 1건에 1원 안팎, 최고 품질 모델은 수십 원~백 원대입니다.
        {!shared && " 키는 서버에서 암호화해 저장되고 화면·브라우저로는 다시 나오지 않습니다."} 키 발급: <a href={info.console} target="_blank" rel="noreferrer" className="underline">{info.label} 콘솔 ↗</a>
      </p>
    </fieldset>
  );
}
