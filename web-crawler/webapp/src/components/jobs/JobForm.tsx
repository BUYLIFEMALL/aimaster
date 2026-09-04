"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createJobAction, type CreateJobState } from "@/lib/actions/jobs";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import type { ApiKeyProvider } from "@/types/database.types";

const initialState: CreateJobState = {};

export function JobForm({ providers }: { providers: ApiKeyProvider[] }) {
  const [state, formAction, isPending] = useActionState(createJobAction, initialState);

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
          name="aiProvider"
          required
          defaultValue={providers[0]}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
        >
          {providers.map((provider) => (
            <option key={provider} value={provider}>
              {PROVIDER_LABELS[provider]}
            </option>
          ))}
        </select>
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
