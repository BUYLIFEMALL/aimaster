"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createJobAction, type CreateJobState } from "@/lib/actions/jobs";
import {
  AI_MODEL_OPTIONS,
  AI_MODEL_PROVIDER_ORDER,
  AI_MODEL_PROVIDER_SHORT_LABELS,
  DEFAULT_MODEL_BY_PROVIDER,
} from "@/lib/ai/models";
import type { ApiKeyProvider } from "@/types/database.types";

const initialState: CreateJobState = {};

export function JobForm({ providers }: { providers: ApiKeyProvider[] }) {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);
  const availableProviders = AI_MODEL_PROVIDER_ORDER.filter((p) => providers.includes(p));
  const defaultModel = availableProviders.length > 0 ? DEFAULT_MODEL_BY_PROVIDER[availableProviders[0]] : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">수집할 페이지 URL</label>
        <Input name="url" type="url" required placeholder="https://example.com/products" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">수집 항목</label>
        <p className="mb-1 text-xs text-neutral-500">
          쉼표(,)로 구분해서 입력해주세요. 예: 상품명, 가격, 평점
        </p>
        <Textarea name="targetFields" rows={3} required placeholder="상품명, 가격, 평점" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-neutral-700">분석에 사용할 AI</label>
        <select
          name="aiModel"
          required
          defaultValue={defaultModel}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
        >
          {availableProviders.map((provider) => (
            <optgroup key={provider} label={AI_MODEL_PROVIDER_SHORT_LABELS[provider]}>
              {AI_MODEL_OPTIONS.filter((opt) => opt.provider === provider).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1 text-xs text-neutral-500">
          더 상위 모델일수록 복잡한 페이지 구조도 잘 찾아내지만, 호출 비용도 함께 올라갑니다.
          페이지 구조가 단순하면 가성비 모델로도 충분합니다.
        </p>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={isPending}>
        {isPending ? "작업 생성 중..." : "작업 시작하기"}
      </Button>
    </form>
  );
}
