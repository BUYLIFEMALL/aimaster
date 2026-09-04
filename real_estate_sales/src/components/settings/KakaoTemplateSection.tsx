"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { saveKakaoTemplateAction, type KakaoTemplateActionState } from "@/lib/actions/solapiAccount";

const initialState: KakaoTemplateActionState = {};

export function KakaoTemplateSection({ templateId }: { templateId: string | null }) {
  const [state, formAction, isPending] = useActionState(saveKakaoTemplateAction, initialState);

  return (
    <div className="border-t border-white/10 pt-4">
      <div className="mb-3">
        <h2 className="text-lg font-medium text-neutral-100">🔔 카카오 알림톡 템플릿 (선택)</h2>
        <p className="text-sm text-neutral-400">
          위 SOLAPI 계정에 등록된 카카오 채널로 <b>알림톡</b>을 받으려면, 먼저 SOLAPI에서 발송
          문구 전체를 담는 변수 1개(예: <code className="rounded bg-dark-200 px-1 py-0.5">#{"{내용}"}</code>)로
          구성한 템플릿을 만들어 승인받은 뒤, 그 템플릿 ID를 아래에 등록하세요.
        </p>
      </div>
      <form action={formAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-white/5 bg-dark-50 p-4">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs text-neutral-400">알림톡 템플릿 ID</label>
          <Input name="templateId" defaultValue={templateId ?? ""} placeholder="KA01TP..." />
        </div>
        <Button type="submit" variant="secondary" disabled={isPending}>
          {isPending ? "저장 중..." : "저장"}
        </Button>
        {state.error && <p className="w-full text-xs text-red-400">{state.error}</p>}
        {state.success && <p className="w-full text-xs text-green-400">{state.success}</p>}
      </form>
    </div>
  );
}
