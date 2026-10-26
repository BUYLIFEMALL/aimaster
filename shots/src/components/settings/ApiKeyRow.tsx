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
    <div className="rounded-xl border border-[#202945] bg-[#161c33] p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-bold text-white">{label}</p>
        {maskedValue && !isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              수정
            </button>
            <form action={deleteApiKeyAction}>
              <input type="hidden" name="provider" value={provider} />
              <button
                type="submit"
                className="rounded-lg border border-rose-900/60 bg-rose-950/40 px-2.5 py-1 text-xs font-semibold text-rose-400 hover:bg-rose-900/60 hover:text-rose-200 transition-colors"
              >
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
            className="min-w-[220px] flex-1 bg-[#0f1325] border-[#202945] text-white placeholder:text-slate-500 focus:border-rose-500"
          />
          <button
            type="submit"
            disabled={isPending}
            className="btn-3d-rec px-4 py-2 text-xs font-bold"
          >
            {isPending ? "저장 중..." : "저장"}
          </button>
          {maskedValue && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="btn-3d-dark px-3 py-2 text-xs"
            >
              취소
            </button>
          )}
        </form>
      ) : (
        <p className="font-mono text-xs text-rose-300 bg-rose-950/30 border border-rose-900/30 rounded-lg px-2.5 py-1 inline-block">
          {maskedValue} · 정상 등록됨
        </p>
      )}
      {state.error && <p className="mt-1.5 text-xs text-rose-400 font-semibold">{state.error}</p>}
      {state.success && <p className="mt-1.5 text-xs text-emerald-400 font-semibold">저장되었습니다.</p>}
    </div>
  );
}
