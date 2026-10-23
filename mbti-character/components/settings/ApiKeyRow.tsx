"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { saveApiKeyAction, deleteApiKeyAction, type SaveApiKeyState } from "@/lib/actions/settings";
import type { ApiKeyProvider } from "@/lib/apiKeys";

interface ApiKeyRowProps {
  provider: ApiKeyProvider;
  label: string;
  maskedValue: string | null;
}

const initialState: SaveApiKeyState = {};

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-500 transition-colors disabled:opacity-50"
    >
      {pending ? "저장 중..." : "저장"}
    </button>
  );
}

export function ApiKeyRow({ provider, label, maskedValue }: ApiKeyRowProps) {
  const [state, formAction] = useFormState(saveApiKeyAction, initialState);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  const showForm = !maskedValue || isEditing;

  return (
    <div className="rounded-xl border border-[#2a1f4e] bg-[#120d24] p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-100 min-w-0">{label}</p>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-emerald-400 hover:underline"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" className="text-xs text-red-500 hover:underline">
                삭제
              </button>
            </form>
          </div>
        )}
      </div>

      {showForm ? (
        <form action={formAction} className="flex flex-wrap gap-2">
          <input type="hidden" name="provider" value={provider} />
          <input
            name="apiKey"
            type="password"
            placeholder={maskedValue ? `새 키 입력 (현재: ${maskedValue})` : "API 키 입력"}
            className="min-w-[220px] flex-1 px-3 py-2 rounded-xl border border-[#2a1f4e] text-sm"
          />
          <SaveButton />
          {maskedValue && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-4 py-2 rounded-xl border border-[#2a1f4e] text-slate-400 text-sm font-semibold hover:bg-[#1c1536] transition-colors"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <p className="font-mono text-sm text-slate-400">{maskedValue} · 등록됨</p>
      )}
      {state.error && <p className="mt-1 text-xs text-red-500">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-green-400">저장되었습니다.</p>}
    </div>
  );
}
