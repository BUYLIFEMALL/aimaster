"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { savePrefsAction, type PrefsState } from "@/lib/actions/watch";
import { BUILDING_USES, JIMOKS, type Prefs } from "@/lib/trades/prefs";

const initial: PrefsState = {};

function Check({ name, value, label, checked }: { name: string; value?: string; label: string; checked: boolean }) {
  return (
    <label className="flex min-h-[40px] items-center gap-2 rounded-lg border border-mx-border bg-dark-100 px-3 py-2 text-sm text-mx-text">
      <input type="checkbox" name={name} value={value} defaultChecked={checked} />
      {label}
    </label>
  );
}

function NumberField({ name, label, unit, value, placeholder }: { name: string; label: string; unit: string; value: number | null; placeholder: string }) {
  return (
    <label className="block text-sm text-mx-muted">
      {label}
      <span className="mt-1 flex items-center gap-2">
        <input name={name} inputMode="decimal" defaultValue={value ?? ""} placeholder={placeholder} className="mx-input min-h-[40px] w-full py-2 text-sm" />
        <span className="shrink-0 text-mx-text">{unit}</span>
      </span>
    </label>
  );
}

export function ConditionsForm({ prefs }: { prefs: Prefs }) {
  const [state, action, pending] = useActionState(savePrefsAction, initial);
  return (
    <form action={action} className="space-y-4">
      <section className="mx-card">
        <h2 className="mx-section-title mb-3">무엇을 볼까요?</h2>
        <div className="grid grid-cols-2 gap-2">
          <Check name="kinds" value="building" label="🏢 상가·건물" checked={prefs.kinds.includes("building")} />
          <Check name="kinds" value="land" label="🌳 토지" checked={prefs.kinds.includes("land")} />
        </div>
      </section>
      <section className="mx-card">
        <h2 className="mx-section-title mb-3">건물 용도</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {BUILDING_USES.map((u) => (
            <Check key={u} name="uses" value={u} label={u} checked={!prefs.excluded_uses.includes(u)} />
          ))}
        </div>
      </section>
      <section className="mx-card">
        <h2 className="mx-section-title mb-3">토지 지목</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {JIMOKS.map((j) => (
            <Check key={j} name="jimoks" value={j} label={j} checked={!prefs.excluded_jimoks.includes(j)} />
          ))}
        </div>
      </section>
      <section className="mx-card">
        <h2 className="mx-section-title mb-3">금액과 면적</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField name="minAmount" label="최소 금액" unit="억" value={prefs.min_amount === null ? null : prefs.min_amount / 10000} placeholder="비우면 제한 없음" />
          <NumberField name="maxAmount" label="최대 금액" unit="억" value={prefs.max_amount === null ? null : prefs.max_amount / 10000} placeholder="비우면 제한 없음" />
          <NumberField name="minArea" label="최소 면적" unit="㎡" value={prefs.min_area} placeholder="비우면 제한 없음" />
          <NumberField name="maxArea" label="최대 면적" unit="㎡" value={prefs.max_area} placeholder="비우면 제한 없음" />
        </div>
        <p className="mt-2 text-xs text-mx-muted">면적은 건물이면 건물면적, 토지면 거래면적입니다.</p>
      </section>
      <section className="mx-card space-y-2">
        <Check name="includeShare" label="지분 거래도 받기 (일부 지분만 사고판 거래)" checked={prefs.include_share} />
        <Check name="notifyEnabled" label="새 거래 알림 받기(받는 곳은 설정에서)" checked={prefs.notify_enabled} />
      </section>
      {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
      {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "저장 중..." : "조건 저장"}
      </Button>
    </form>
  );
}
