"use client";

import { useState } from "react";
import { OPENAI_CONTENT_MODELS, type OpenAIContentModel } from "@/lib/ai/openaiModels";
import { GEMINI_IMAGE_MODELS, type GeminiImageModel } from "@/lib/ai/geminiModels";

type Provider = "openai" | "gemini";

export default function ApiKeySettings({ initialProviders, maskedKeys = {}, initialModel, initialGeminiModel }: { initialProviders: Provider[]; maskedKeys?: Partial<Record<Provider, string>>; initialModel: OpenAIContentModel; initialGeminiModel: GeminiImageModel }) {
  const [values, setValues] = useState<Record<Provider, string>>({ openai: "", gemini: "" });
  const [providers, setProviders] = useState(initialProviders);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Provider | null>(null);
  const [geminiModel, setGeminiModel] = useState<GeminiImageModel>(initialGeminiModel);

  async function save(provider: Provider) {
    if (!values[provider].trim()) {
      setMessage("저장할 API 키를 입력해주세요.");
      return;
    }
    setPending(provider);
    setMessage("");
    const response = await fetch("/api/settings/api-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, apiKey: values[provider].trim() }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setMessage(result.error || "API 키 저장에 실패했습니다.");
    else {
      setMessage(`${provider === "openai" ? "OpenAI" : "Gemini"} API 키를 저장했습니다.`);
      setValues((current) => ({ ...current, [provider]: "" }));
      setProviders((current) => current.includes(provider) ? current : [...current, provider]);
    }
    setPending(null);
  }

  async function remove(provider: Provider) {
    setPending(provider);
    const response = await fetch(`/api/settings/api-key?provider=${provider}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setMessage(response.ok ? `${provider === "openai" ? "OpenAI" : "Gemini"} API 키 연결을 해제했습니다.` : (result.error || "연결 해제에 실패했습니다."));
    if (response.ok) setProviders((current) => current.filter((item) => item !== provider));
    setPending(null);
  }

  async function saveGeminiModel() {
    setPending("gemini");
    setMessage("");
    const response = await fetch("/api/settings/ai-model", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ geminiModel }),
    });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setMessage(response.ok ? "Gemini 이미지 생성모델을 저장했습니다." : (result.error || "Gemini 생성모델 저장에 실패했습니다."));
    setPending(null);
  }

  return (
    <div className="settings-stack">
      <div className="key-row">
        {maskedKeys.openai && <code className="saved-key-inline">계정 등록 키: {maskedKeys.openai}</code>}
        <div><strong>OpenAI</strong><p>제목·본문·SEO 검수 리포트 생성에 사용합니다.</p><span className="selected-model-badge">현재 생성 모델: {OPENAI_CONTENT_MODELS.find((option) => option.value === initialModel)?.label ?? initialModel}</span></div>
        <div className="key-actions"><input type="password" placeholder={providers.includes("openai") ? "등록된 키가 있습니다" : "sk-..."} value={values.openai} onChange={(event) => setValues((current) => ({ ...current, openai: event.target.value }))} autoComplete="off" /><button className="small-button" onClick={() => save("openai")} disabled={pending !== null}>{pending === "openai" ? "저장 중" : "저장"}</button>{providers.includes("openai") && <button className="text-button" onClick={() => remove("openai")} disabled={pending !== null}>해제</button>}</div>
      </div>
      <div className="key-row">
        {maskedKeys.gemini && <code className="saved-key-inline">계정 등록 키: {maskedKeys.gemini}</code>}
        <div><strong>Gemini</strong><p>글 속 이미지와 썸네일 생성에 사용합니다.</p><span className="selected-model-badge">현재 이미지 모델: {GEMINI_IMAGE_MODELS.find((option) => option.value === geminiModel)?.label ?? geminiModel}</span></div>
        <div className="key-actions"><input type="password" placeholder={providers.includes("gemini") ? "등록된 키가 있습니다" : "AIza..."} value={values.gemini} onChange={(event) => setValues((current) => ({ ...current, gemini: event.target.value }))} autoComplete="off" /><button className="small-button" onClick={() => save("gemini")} disabled={pending !== null}>{pending === "gemini" ? "저장 중" : "저장"}</button>{providers.includes("gemini") && <button className="text-button" onClick={() => remove("gemini")} disabled={pending !== null}>해제</button>}</div>
        <div className="model-choice-row"><label htmlFor="gemini-image-model">이미지 생성모델</label><select id="gemini-image-model" value={geminiModel} onChange={(event) => setGeminiModel(event.target.value as GeminiImageModel)} disabled={pending !== null}>{GEMINI_IMAGE_MODELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="small-button" onClick={saveGeminiModel} disabled={pending !== null}>모델 저장</button></div>
      </div>
      {message && <p className="settings-message" role="status">{message}</p>}
      <div className="notice">API 키는 사용자 계정별로 관리됩니다. API 키가 없으면 AI 생성 기능을 실행하지 않습니다.</div>
    </div>
  );
}
