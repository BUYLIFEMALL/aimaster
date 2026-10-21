"use client";
import {
  MODELS,
  PROVIDERS,
  type Brief,
  type Provider,
} from "@/lib/studio/config";
export function AIModelPicker({
  brief,
  onChange,
  busy,
}: {
  brief: Brief;
  onChange: (brief: Brief) => void;
  busy: boolean;
}) {
  function provider(p: Provider) {
    if (p === brief.provider) return;
    const m = MODELS.find((m) => m.provider === p)!;
    onChange({ ...brief, provider: p, model: m.id, customModel: false });
  }
  return (
    <fieldset disabled={busy} className="ai-model-picker">
      <legend>AI 공급사·모델</legend>
      <div className="actions">
        {PROVIDERS.map((p) => (
          <button
            key={p}
            aria-pressed={brief.provider === p}
            className={brief.provider === p ? "selected" : ""}
            onClick={() => provider(p)}
          >
            {p === "anthropic"
              ? "Claude"
              : p === "openai"
                ? "OpenAI"
                : "Gemini"}
          </button>
        ))}
      </div>
      <label>
        AI 모델
        <select
          aria-label="AI 모델"
          value={brief.customModel ? "custom" : brief.model}
          onChange={(e) => {
            if (e.target.value === "custom") {
              onChange({ ...brief, customModel: true });
              return;
            }
            onChange({ ...brief, model: e.target.value, customModel: false });
          }}
        >
          {MODELS.filter((m) => m.provider === brief.provider).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
          <option value="custom">직접 모델 입력</option>
        </select>
      </label>
      {brief.customModel && (
        <label>
          모델 ID
          <input
            aria-label="모델 ID"
            value={brief.model}
            maxLength={100}
            onChange={(e) => onChange({ ...brief, model: e.target.value })}
          />
        </label>
      )}
      <small>
        선택한 공급사의 본인 키만 사용합니다. 호출 실패 시 다른 모델로 바꾸지
        않습니다.
      </small>
    </fieldset>
  );
}
