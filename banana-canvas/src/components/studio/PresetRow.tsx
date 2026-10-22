"use client";
import { useState } from "react";
import { BookmarkPlus, X } from "lucide-react";
import type { Preset, PresetKind, PresetSettings } from "@/lib/bnc/presets";
import { MAX_PRESETS } from "@/lib/bnc/presets";

/**
 * 「📌 내 작업 레시피」(v1.18): 카드 설정을 이름 붙여 저장하고, 다른 사진에서 불러와 카드 값을 그대로 채운다.
 * 불러오기는 값만 채운다 — 실행(유료 생성)은 회원이 카드의 실행 버튼을 직접 누른다.
 */
export function PresetRow({ kind, presets, current, disabled, onApply, onChange, onError }: {
  kind: PresetKind;
  presets: Preset[];
  current: () => PresetSettings;
  disabled?: boolean;
  onApply: (s: PresetSettings) => void;
  onChange: (next: Preset[]) => void;
  onError: (text: string) => void;
}) {
  const mine = presets.filter((p) => p.kind === kind);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [pick, setPick] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/presets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, name, settings: current() }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { onError(data.error ?? "레시피를 저장하지 못했습니다."); return; }
      onChange([data.item as Preset, ...presets]);
      setNaming(false); setName(""); setPick((data.item as Preset).id);
    } catch { onError("서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요."); }
    finally { setSaving(false); }
  }

  async function drop(id: string) {
    const res = await fetch(`/api/presets?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
    if (!res?.ok) { onError("레시피를 지우지 못했습니다. 다시 시도해 주세요."); return; }
    onChange(presets.filter((p) => p.id !== id));
    setPick("");
  }

  return (
    <div className="bc-preset">
      <span className="bc-label">📌 내 작업 레시피</span>
      {mine.length > 0 && (
        <select value={pick} disabled={disabled} aria-label="저장한 레시피 불러오기"
          onChange={(e) => { setPick(e.target.value); const p = mine.find((x) => x.id === e.target.value); if (p) onApply(p.settings); }}>
          <option value="">불러오기…</option>
          {mine.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      )}
      {pick && <button type="button" disabled={disabled} aria-label="고른 레시피 지우기" title="고른 레시피 지우기" onClick={() => void drop(pick)}><X size={13} /></button>}
      {naming ? (
        <>
          <input value={name} maxLength={30} autoFocus disabled={saving} placeholder="레시피 이름 (예: 빈티지 필름 보정)" aria-label="레시피 이름"
            onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void save(); if (e.key === "Escape") setNaming(false); }} />
          <button type="button" className="primary" disabled={saving || !name.trim()} onClick={() => void save()}>{saving ? "저장 중…" : "저장"}</button>
          <button type="button" disabled={saving} onClick={() => setNaming(false)}>취소</button>
        </>
      ) : (
        <button type="button" disabled={disabled || presets.length >= MAX_PRESETS} title={presets.length >= MAX_PRESETS ? `레시피는 ${MAX_PRESETS}개까지 저장할 수 있습니다` : "지금 카드 설정을 레시피로 저장"}
          onClick={() => setNaming(true)}><BookmarkPlus size={13} />지금 설정 저장</button>
      )}
    </div>
  );
}
