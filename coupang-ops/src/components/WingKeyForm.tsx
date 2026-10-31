"use client";

import { useActionState, useTransition } from "react";
import { deleteWingKeysAction, saveWingKeysAction } from "@/lib/actions/connection";
import { KeyRound, Check, Trash2, ShieldAlert } from "lucide-react";

const FIELDS: { name: string; label: string; hint: string; secret?: boolean }[] = [
  { name: "vendorId", label: "업체코드 (Vendor ID)", hint: "A로 시작하는 번호 (예: A00012345)" },
  { name: "accessKey", label: "Access Key", hint: "WING 「OPEN API 키 발급」 표의 Access Key", secret: true },
  { name: "secretKey", label: "Secret Key", hint: "같은 표의 Secret Key — 다른 사람에게 보여 주지 마세요", secret: true },
  { name: "wingUserId", label: "WING 로그인 ID", hint: "WING 로그인 계정 ID (상품 등록 필수)" },
];

export function WingKeyForm({ saved }: { saved: boolean }) {
  const [state, action, saving] = useActionState(saveWingKeysAction, {});
  const [deleting, startDelete] = useTransition();

  return (
    <form action={action} className="space-y-4" autoComplete="off">
      <div className="grid gap-3.5 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.name} className="block">
            <span className="text-xs font-bold text-slate-700">{f.label}</span>
            <input
              name={f.name}
              type={f.secret ? "password" : "text"}
              autoComplete={f.secret ? "new-password" : "off"}
              data-1p-ignore
              data-lpignore="true"
              required
              spellCheck={false}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
            />
            <span className="mt-1 block text-[11px] text-slate-500">{f.hint}</span>
          </label>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="btn-3d-indigo text-xs py-2 px-5"
        >
          <KeyRound size={14} />
          <span>{saving ? "저장 중…" : saved ? "새 WING 키로 변경 저장" : "WING API 키 저장하기"}</span>
        </button>

        {saved && (
          <button
            type="button"
            disabled={deleting}
            onClick={() => {
              if (confirm("저장된 쿠팡 키 4개를 지울까요? 쿠팡 쪽 키는 그대로 남습니다.")) {
                startDelete(async () => {
                  await deleteWingKeysAction();
                });
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-red-600 transition-colors"
          >
            <Trash2 size={13} />
            <span>{deleting ? "삭제 중…" : "저장된 키 삭제"}</span>
          </button>
        )}

        {state.ok && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            <Check size={13} />
            <span>안전하게 저장되었습니다</span>
          </span>
        )}
        {state.error && (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
            <ShieldAlert size={13} />
            <span>{state.error}</span>
          </span>
        )}
      </div>
    </form>
  );
}
