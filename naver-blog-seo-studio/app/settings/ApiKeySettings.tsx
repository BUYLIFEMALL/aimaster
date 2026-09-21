"use client";

import { useState } from "react";

type Provider = "openai" | "gemini";

export default function ApiKeySettings({ initialProviders }: { initialProviders: Provider[] }) {
  const [values, setValues] = useState<Record<Provider, string>>({ openai: "", gemini: "" });
  const [providers, setProviders] = useState(initialProviders);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Provider | null>(null);

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

  return (
    <div className="settings-stack">
      <div className="key-row">
        <div><strong>OpenAI</strong><p>제목·본문·SEO 검수 리포트 생성에 사용합니다.</p></div>
        <div className="key-actions"><input type="password" placeholder={providers.includes("openai") ? "등록된 키가 있습니다" : "sk-..."} value={values.openai} onChange={(event) => setValues((current) => ({ ...current, openai: event.target.value }))} autoComplete="off" /><button className="small-button" onClick={() => save("openai")} disabled={pending !== null}>{pending === "openai" ? "저장 중" : "저장"}</button>{providers.includes("openai") && <button className="text-button" onClick={() => remove("openai")} disabled={pending !== null}>해제</button>}</div>
      </div>
      <div className="key-row">
        <div><strong>Gemini</strong><p>향후 글 속 이미지와 썸네일 생성에 사용합니다.</p></div>
        <div className="key-actions"><input type="password" placeholder={providers.includes("gemini") ? "등록된 키가 있습니다" : "AIza..."} value={values.gemini} onChange={(event) => setValues((current) => ({ ...current, gemini: event.target.value }))} autoComplete="off" /><button className="small-button" onClick={() => save("gemini")} disabled={pending !== null}>{pending === "gemini" ? "저장 중" : "저장"}</button>{providers.includes("gemini") && <button className="text-button" onClick={() => remove("gemini")} disabled={pending !== null}>해제</button>}</div>
      </div>
      {message && <p className="settings-message" role="status">{message}</p>}
      <div className="notice">API 키는 주인님의 AIMaster 계정에만 연결됩니다. 운영자 키로 자동 대체하지 않으며, 키가 없으면 AI 생성 기능을 실행하지 않습니다.</div>
      <div className="guide-box"><strong>📖 연동 매뉴얼</strong><p>키 발급 방법은 AIMaster의 플랫폼 매뉴얼에서 확인할 수 있습니다.</p><div className="guide-links"><a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">OpenAI 키 발급</a><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini 키 발급</a></div></div>
    </div>
  );
}
