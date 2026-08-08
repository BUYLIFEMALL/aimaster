"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from "@/lib/actions/settings";
import type { ApiKeyProvider } from "@/types/database.types";

interface ApiKeyRowProps {
  provider: ApiKeyProvider;
  label: string;
  maskedValue: string | null;
}

const initialState: SaveApiKeyState = {};

export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [state, formAction, isPending] = useActionState(saveApiKeyAction, initialState);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-base font-bold text-neutral-900">{label}</p>
        {maskedValue && (
          <form action={deleteApiKeyAction}>
            <input type="hidden" name="provider" value={provider} />
            <button
              type="submit"
              className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
            >
              삭제
            </button>
          </form>
        )}
      </div>

      {maskedValue ? (
        <p className="font-mono text-sm text-neutral-500">{maskedValue} · 등록됨</p>
      ) : (
        <form action={formAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <Input
            name="apiKey"
            type="password"
            placeholder="API 키 입력"
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
        </form>
      )}
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
    </div>
  );
}
