"use client";

// v1.97 (2026-10-22): 설정 화면에 다시 붙임 — ① 글쓰기 기본 AI(작업 화면 선택과 같은 계정 값) ② OpenAI 전용 기능 모델.
import { useState } from "react";
import { CONTENT_PROVIDER_LABELS, CONTENT_PROVIDERS, getContentModels, getDefaultContentModel, type ContentProvider } from "@/lib/ai/contentModels";
import { OPENAI_CONTENT_MODELS } from "@/lib/ai/openaiModels";

export default function AiModelSettings({ initialContent, initialOpenAI }: { initialContent: { provider: ContentProvider; model: string } | null; initialOpenAI: string }) {
  const [provider, setProvider] = useState<ContentProvider>(initialContent?.provider ?? "openai");
  const [model, setModel] = useState<string>(initialContent?.model ?? getDefaultContentModel(initialContent?.provider ?? "openai"));
  const [openaiModel, setOpenaiModel] = useState<string>(initialOpenAI);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save(body: object, done: string) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/settings/ai-model", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({})) as { error?: string; openaiFeature?: string };
      if (!response.ok) throw new Error(result.error || "AI 모델 저장에 실패했습니다.");
      if (result.openaiFeature) setOpenaiModel(result.openaiFeature);
      setMessage(done);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 모델 저장에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="settings-stack ai-model-settings">
      <div className="key-row">
        <div><strong>글쓰기 기본 AI</strong><p>새 글·자료부터 집필·구간별 쓰기·내 문체 분석에 씁니다. 작업 화면에서 고른 모델과 같은 값이며 계정에 저장돼 다른 PC에서도 이어집니다.</p></div>
        <div className="key-actions">
          <select value={provider} onChange={(e) => { const p = e.target.value as ContentProvider; setProvider(p); setModel(getDefaultContentModel(p)); }} disabled={pending} aria-label="글쓰기 기본 AI 회사">
            {CONTENT_PROVIDERS.map((p) => <option key={p} value={p}>{CONTENT_PROVIDER_LABELS[p]}</option>)}
          </select>
          <select value={model} onChange={(e) => setModel(e.target.value)} disabled={pending} aria-label="글쓰기 기본 AI 모델">
            {getContentModels(provider).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button className="small-button" onClick={() => save({ content: { provider, model } }, "글쓰기 기본 AI를 저장했습니다. 작업 화면을 다시 열면 적용됩니다.")} disabled={pending}>{pending ? "저장 중" : "저장"}</button>
        </div>
      </div>
      <div className="key-row">
        <div><strong>OpenAI 전용 기능 모델</strong><p>제목 추천·기존 글 분석/최적화·본문 이미지 고르기는 OpenAI로만 동작합니다. 글쓰기 기본 AI가 OpenAI이면 그 모델을 쓰고, Claude·Gemini이면 이 모델을 씁니다.</p></div>
        <div className="key-actions">
          <select value={provider === "openai" ? model : openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} disabled={pending || provider === "openai"} aria-label="OpenAI 전용 기능 모델">
            {OPENAI_CONTENT_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <button className="small-button" onClick={() => save({ model: openaiModel }, "OpenAI 전용 기능 모델을 저장했습니다.")} disabled={pending || provider === "openai"}>{pending ? "저장 중" : "저장"}</button>
        </div>
      </div>
      {message && <p className="settings-message" role="status">{message}</p>}
    </div>
  );
}
