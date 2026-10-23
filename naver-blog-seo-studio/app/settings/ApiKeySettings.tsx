"use client";

import { useState } from "react";

type Provider = "openai" | "anthropic" | "gemini";
const providerInfo: Record<Provider, { title: string; description: string; placeholder: string }> = {
  openai: { title: "OpenAI", description: "제목·본문·SEO 분석 생성에 사용합니다.", placeholder: "sk-..." },
  anthropic: { title: "Anthropic Claude", description: "Claude 모델로 제목 선택 후 본문을 생성할 때 사용합니다.", placeholder: "sk-ant-..." },
  gemini: { title: "Google Gemini", description: "Gemini 본문 모델과 나노바나나 이미지 생성에 사용합니다.", placeholder: "AIza..." },
};

export default function ApiKeySettings({ initialProviders, maskedKeys = {} }: { initialProviders: Provider[]; maskedKeys?: Partial<Record<Provider, string>> }) {
  const [values, setValues] = useState<Record<Provider, string>>({ openai: "", anthropic: "", gemini: "" });
  const [providers, setProviders] = useState(initialProviders);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Provider | null>(null);
  const label = (provider: Provider) => providerInfo[provider].title;

  async function save(provider: Provider) {
    if (!values[provider].trim()) { setMessage("저장할 API 키를 입력해주세요."); return; }
    setPending(provider); setMessage("");
    const response = await fetch("/api/settings/api-key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey: values[provider].trim() }) });
    const result = await response.json().catch(() => ({})) as { error?: string };
    if (!response.ok) setMessage(result.error || "API 키 저장에 실패했습니다.");
    else { setMessage(`${label(provider)} API 키를 저장했습니다.`); setValues((current) => ({ ...current, [provider]: "" })); setProviders((current) => current.includes(provider) ? current : [...current, provider]); }
    setPending(null);
  }

  async function remove(provider: Provider) {
    setPending(provider);
    const response = await fetch(`/api/settings/api-key?provider=${provider}`, { method: "DELETE" });
    const result = await response.json().catch(() => ({})) as { error?: string };
    setMessage(response.ok ? `${label(provider)} API 연결을 해제했습니다.` : (result.error || "연결 해제에 실패했습니다."));
    if (response.ok) setProviders((current) => current.filter((item) => item !== provider));
    setPending(null);
  }

  return <div className="settings-stack">{(Object.keys(providerInfo) as Provider[]).map((provider) => <div className="key-row" key={provider}>
    {maskedKeys[provider] && <code className="saved-key-inline">계정 등록 키: {maskedKeys[provider]}</code>}
    <div><strong>{providerInfo[provider].title}</strong><p>{providerInfo[provider].description}</p></div>
    <div className="key-actions"><input type="password" placeholder={providers.includes(provider) ? "등록된 키가 있습니다" : providerInfo[provider].placeholder} value={values[provider]} onChange={(event) => setValues((current) => ({ ...current, [provider]: event.target.value }))} autoComplete="off" /><button className="small-button" onClick={() => void save(provider)} disabled={pending !== null}>{pending === provider ? "저장 중..." : "저장"}</button>{providers.includes(provider) && <button className="text-button" onClick={() => void remove(provider)} disabled={pending !== null}>해제</button>}</div>
  </div>)}{message && <p className="settings-message" role="status">{message}</p>}<div className="notice">API 키는 회원님의 계정별로만 보관하며, 선택한 플랫폼의 키만 해당 본문 생성에 사용합니다.</div></div>;
}
