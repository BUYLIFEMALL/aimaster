"use client";

import { useState } from "react";
import { PRESET_PERSONAS } from "@/lib/constants/personas";
import { saveMyPersonaAction } from "@/lib/actions/personas";
import type { SavedPersona } from "@/lib/personaTone";

interface PersonaPickerProps {
  value: string;
  onChange: (id: string) => void;
  customText: string;
  onCustomTextChange: (text: string) => void;
  savedPersonas: SavedPersona[];
  onPersonaSaved: (persona: SavedPersona) => void;
}

export function PersonaPicker({
  value,
  onChange,
  customText,
  onCustomTextChange,
  savedPersonas,
  onPersonaSaved,
}: PersonaPickerProps) {
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [sampleWriting, setSampleWriting] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const selectedPreset = PRESET_PERSONAS.find((p) => p.id === value);
  const selectedSaved = savedPersonas.find((p) => p.id === value);

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    const res = await saveMyPersonaAction({ name: saveName, toneDescription: customText, sampleWriting });
    setSaving(false);
    if (res.error || !res.persona) {
      setSaveError(res.error ?? "저장에 실패했습니다.");
      return;
    }
    onPersonaSaved(res.persona);
    onChange(res.persona.id);
    setSaveOpen(false);
    setSaveName("");
    setSampleWriting("");
  };

  return (
    <div className="space-y-2">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs font-semibold text-neutral-800 focus:border-neutral-900 focus:outline-none cursor-pointer"
      >
        <optgroup label="기본 페르소나">
          {PRESET_PERSONAS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
        {savedPersonas.length > 0 && (
          <optgroup label="💾 내 저장 페르소나">
            {savedPersonas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </optgroup>
        )}
        <option value="custom">✍️ 커스텀 페르소나 직접 입력</option>
      </select>

      {value === "custom" ? (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="예: 30대 자취생 말투, 감성적인 어조, 이모지 많이 사용"
            value={customText}
            onChange={(e) => onCustomTextChange(e.target.value)}
            maxLength={500}
            className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-neutral-900 focus:outline-none"
          />
          {!saveOpen ? (
            <button
              type="button"
              onClick={() => setSaveOpen(true)}
              disabled={!customText.trim()}
              className="rounded-lg border border-purple-300 bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-700 hover:bg-purple-100 disabled:opacity-40"
            >
              💾 내 페르소나로 저장 (다음부터 목록에서 선택)
            </button>
          ) : (
            <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/60 p-2.5">
              <input
                type="text"
                placeholder="페르소나 이름 (예: 30대 자취생)"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                maxLength={40}
                className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-purple-600 focus:outline-none"
              />
              <textarea
                placeholder="(선택) 이 말투로 쓴 예시 문장 — AI가 문체만 참고합니다"
                value={sampleWriting}
                onChange={(e) => setSampleWriting(e.target.value)}
                maxLength={1000}
                rows={3}
                className="w-full rounded-lg border border-neutral-300 bg-white p-2 text-xs focus:border-purple-600 focus:outline-none"
              />
              {saveError && <p className="text-[11px] font-semibold text-red-600">{saveError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !saveName.trim()}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button
                  type="button"
                  onClick={() => setSaveOpen(false)}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-bold text-neutral-600 hover:bg-neutral-50"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-neutral-200 bg-white p-2.5 text-xs leading-relaxed text-neutral-600 whitespace-pre-line">
          💡 <span className="font-semibold text-purple-700">적용될 어조:</span>{" "}
          {selectedSaved?.toneDescription ?? selectedPreset?.toneDescription}
          {selectedSaved?.sampleWriting && (
            <span className="mt-1 block text-[11px] text-neutral-500">📝 예시 문장: {selectedSaved.sampleWriting}</span>
          )}
        </p>
      )}
    </div>
  );
}
