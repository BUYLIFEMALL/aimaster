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
  helpUrl?: string;
  helpLabel?: string;
}

const initialState: SaveApiKeyState = {};

export function ApiKeyRow({ provider, label, maskedValue, helpUrl, helpLabel }: ApiKeyRowProps) {
  const [state, formAction, isPending] = useActionState(saveApiKeyAction, initialState);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (state.success) setIsEditing(false);
  }, [state.success]);

  const showForm = !maskedValue || isEditing;

  return (
    <div className="rounded-xl border border-[#262c3d] bg-[#0d0f17] p-3.5">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-200">{label}</p>
          {helpUrl && !maskedValue && (
            <a
              href={helpUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-pink-400 hover:underline"
            >
              {helpLabel ?? "발급받기"}
            </a>
          )}
        </div>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs text-sky-400 hover:underline"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button type="submit" className="text-xs text-rose-400 hover:underline">
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
            className="min-w-[220px] flex-1 bg-[#161922] border-[#262c3d] text-slate-100 placeholder-slate-500"
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
        <p className="font-mono text-xs text-emerald-400 font-semibold">{maskedValue} · 등록됨</p>
      )}
      {state.error && <p className="mt-1 text-xs text-rose-400">{state.error}</p>}
      {state.success && <p className="mt-1 text-xs text-emerald-400">저장되었습니다.</p>}
    </div>
  );
}
