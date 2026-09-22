"use client";

import { useState } from "react";
import { OPENAI_CONTENT_MODELS, type OpenAIContentModel } from "@/lib/ai/openaiModels";

export default function AiModelSettings({ initialModel }: { initialModel: OpenAIContentModel }) {
  const [model, setModel] = useState<OpenAIContentModel>(initialModel);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/ai-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model }),
      });
      const result = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(result.error || "OpenAI 생성모델 저장에 실패했습니다.");
      setMessage("OpenAI 생성모델을 저장했습니다. 다음 콘텐츠 생성부터 적용됩니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "OpenAI 생성모델 저장에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="settings-stack ai-model-settings">
      <div className="key-row">
        <div><strong>OpenAI 콘텐츠 생성모델</strong><p>제목·본문·SEO 검수·Chrome 확장의 초안 생성에 사용할 모델입니다.</p></div>
        <div className="key-actions">
          <select value={model} onChange={(event) => setModel(event.target.value as OpenAIContentModel)} disabled={pending} aria-label="OpenAI 콘텐츠 생성모델">
            {OPENAI_CONTENT_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button className="small-button" onClick={save} disabled={pending}>{pending ? "저장 중" : "모델 저장"}</button>
        </div>
      </div>
      {message && <p className="settings-message" role="status">{message}</p>}
    </div>
  );
}
