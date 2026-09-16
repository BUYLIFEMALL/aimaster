"use client";

import { useActionState, useEffect, useState } from "react";
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
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  const showForm = !maskedValue || isEditing;

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-900">{label}</p>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-emerald-600 hover:underline"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" className="text-xs text-red-600 hover:underline">
                삭제
              </button>
            </form>
          </div>
        )}
      </div>

      {showForm ? (
        <form action={formAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <Input
            name="apiKey"
            type="password"
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : "API 키 입력"}
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" variant="secondary" disabled={isPending}>
            {isPending ? "저장 중..." : "저장"}
          </Button>
          {maskedValue && (
            <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
              취소
            </Button>
          )}
        </form>
      ) : (
        <p className="font-mono text-sm text-neutral-500">{maskedValue} · 등록됨</p>
      )}
      {state.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-green-600">저장되었습니다.</p>}
    </div>
  );
}
