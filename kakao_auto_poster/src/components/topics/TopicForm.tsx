"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createTopicAction, type CreateTopicState } from "@/lib/actions/topics";

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
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "등록 중..." : "+ 주제 등록"}
      </Button>
    </form>
  );
}
