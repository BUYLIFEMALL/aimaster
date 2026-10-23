"use client";

import { Specification } from "@/types/product";

interface Props {
  specs: Specification[];
  onChange: (specs: Specification[]) => void;
}

export default function SpecsEditor({ specs, onChange }: Props) {
  function addRow() {
    onChange([...specs, { key: "", value: "" }]);
  }

  function removeRow(index: number) {
    onChange(specs.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: "key" | "value", value: string) {
    const updated = specs.map((spec, i) =>
      i === index ? { ...spec, [field]: value } : spec
    );
    onChange(updated);
  }

  return (
    <div className="space-y-2">
      {specs.map((spec, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="항목 (예: 소재)"
            value={spec.key}
            onChange={(e) => updateRow(i, "key", e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <input
            type="text"
            placeholder="내용 (예: 100% 면)"
            value={spec.value}
            onChange={(e) => updateRow(i, "value", e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={() => removeRow(i)}
            className="text-red-400 hover:text-red-600 text-lg font-bold px-2"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        className="text-sm text-blue-500 hover:text-blue-700 font-medium flex items-center gap-1"
      >
        <span>+</span> 스펙 항목 추가
      </button>
    </div>
  );
}
