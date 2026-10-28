"use client";

import { useActionState, useTransition } from "react";
import { deleteWingKeysAction, saveWingKeysAction } from "@/lib/actions/connection";

const FIELDS: { name: string; label: string; hint: string; secret?: boolean }[] = [
  { name: "vendorId", label: "업체코드", hint: "A로 시작하는 번호(예: A00012345)" },
  { name: "accessKey", label: "Access Key", hint: "WING 「OPEN API 키 발급」 표의 Access Key", secret: true },
  { name: "secretKey", label: "Secret Key", hint: "같은 표의 Secret Key — 다른 사람에게 보여 주지 마세요", secret: true },
  { name: "wingUserId", label: "WING 로그인 ID", hint: "WING에 로그인할 때 쓰는 아이디(상품 등록에 필요)" },
];

export function WingKeyForm({ saved }: { saved: boolean }) {
  const [state, action, saving] = useActionState(saveWingKeysAction, {});
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.name} className="block">
            <span className="text-xs font-bold text-slate-700">{f.label}</span>
            <input
              name={f.name}
              type={f.secret ? "password" : "text"}
              required
              spellCheck={false}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm focus:border-rose-500 focus:outline-none"
            />
            <span className="mt-0.5 block text-[11px] text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={saving} className="rounded-lg bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60">
          {saving ? "저장 중…" : saved ? "새 키로 바꾸기" : "키 저장"}
        </button>
        {saved && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm("저장된 쿠팡 키 4개를 지울까요? 쿠팡 쪽 키는 그대로 남습니다.")) startDelete(async () => { await deleteWingKeysAction(); });
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            {deleting ? "지우는 중…" : "저장된 키 지우기"}
          </button>
        )}
        {state.ok && <span className="text-xs font-bold text-teal-700">✅ 저장했습니다</span>}
        {state.error && <span className="text-xs font-bold text-rose-700">{state.error}</span>}
      </div>
    </form>
  );
}
