"use client";

import { useActionState } from "react";
import { BUSINESS_FIELDS, type BusinessInfo } from "@/lib/businessInfo";
import { saveStoreInfoAction, type SettingsState } from "./actions";

const initial: SettingsState = { saved: false, error: null, fieldErrors: {} };

const GROUPS: { title: string; keys: (keyof BusinessInfo)[] }[] = [
  { title: "사업자 정보 (손님 화면 바닥글에 표시)", keys: ["company_name", "ceo_name", "business_no", "mail_order_no", "address", "privacy_officer"] },
  { title: "고객센터", keys: ["phone", "email", "cs_hours"] },
  { title: "무통장 입금 계좌 (주문서·바닥글에 표시)", keys: ["bank_name", "bank_account", "bank_holder"] },
];

export default function SettingsForm({ slug, name, info }: { slug: string; name: string; info: BusinessInfo }) {
  const [state, formAction, pending] = useActionState(saveStoreInfoAction.bind(null, slug), initial);
  const fields = new Map(BUSINESS_FIELDS.map((f) => [f.key, f]));
  const shown = state.values ?? { name, ...info };

  return (
    <form action={formAction} className="space-y-6">
      <fieldset className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">몰 기본 정보</legend>
        <label className="block">
          <span className="text-sm">몰 이름 <span className="text-red-600">*</span></span>
          <input name="name" defaultValue={shown.name} maxLength={40} className="mt-1 w-full rounded border px-3 py-2" />
          {state.fieldErrors.name && <span className="text-xs text-red-600">{state.fieldErrors.name}</span>}
        </label>
      </fieldset>

      {GROUPS.map((g) => (
        <fieldset key={g.title} className="rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">{g.title}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.keys.map((key) => {
              const f = fields.get(key)!;
              return (
                <label key={key} className={`block ${key === "address" ? "sm:col-span-2" : ""}`}>
                  <span className="text-sm">
                    {f.label} {f.required && <span className="text-red-600">*</span>}
                  </span>
                  <input
                    name={key}
                    defaultValue={shown[key] ?? ""}
                    maxLength={f.max}
                    placeholder={f.placeholder}
                    className="mt-1 w-full rounded border px-3 py-2"
                  />
                  {state.fieldErrors[key] && <span className="text-xs text-red-600">{state.fieldErrors[key]}</span>}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <p className="text-xs text-gray-500">
        <span className="text-red-600">*</span> 표시는 손님 화면 바닥글에 꼭 필요한 칸입니다(전자상거래법 표시 항목). 비워 두고 저장할 수는 있지만, 영업 전에 채워 주세요.
      </p>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state.saved && <p className="text-sm text-green-700">저장했습니다. 손님 화면 바닥글에 바로 반영됩니다.</p>}
      <button disabled={pending} className="min-h-11 w-full rounded bg-gray-900 py-2 text-white disabled:opacity-50 sm:w-40">
        {pending ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
