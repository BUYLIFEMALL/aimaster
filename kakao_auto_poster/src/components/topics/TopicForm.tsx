"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTopicAction, type CreateTopicState } from "@/lib/actions/topics";
import { LOOKBACK_DAYS_OPTIONS } from "@/lib/validation";

const initialState: CreateTopicState = {};

export function TopicForm() {
  const [state, formAction, isPending] = useActionState(createTopicAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">주제 이름</label>
        <Input name="topicName" placeholder="예: 1인 가구 정책" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">관련 키워드 (콤마로 구분, 최대 10개)</label>
        <Input name="keywords" placeholder="예: 1인가구 지원금, 청년 주거정책, 전세사기 예방" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">데이터 조회 범위</label>
        <select
          name="lookbackDays"
          defaultValue={14}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900"
        >
          {LOOKBACK_DAYS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-400">이 범위 이내의 최신 정보만 찾아서 콘텐츠를 만듭니다. 등록 후에도 각 주제 카드에서 바꿀 수 있어요.</p>
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "등록 중..." : "+ 주제 등록"}
      </Button>
    </form>
  );
}
