"use client";

import { useState } from "react";
import { KeyRound, ExternalLink, UserPlus } from "lucide-react";

type Provider = "openai" | "anthropic" | "gemini";
const providerInfo: Record<
  Provider,
  {
    title: string;
    description: string;
    placeholder: string;
    createUrl: string;
    signupUrl: string;
    platformName: string;
  }
> = {
  openai: {
    title: "OpenAI (ChatGPT)",
    platformName: "OpenAI",
    description: "제목·본문·SEO 분석 생성에 사용합니다.",
    placeholder: "sk-...",
    createUrl: "https://platform.openai.com/api-keys",
    signupUrl: "https://platform.openai.com/signup",
  },
  anthropic: {
    title: "Anthropic Claude",
    platformName: "Anthropic Claude",
    description: "Claude 모델로 제목 선택 후 고품질 본문을 생성할 때 사용합니다.",
    placeholder: "sk-ant-...",
    createUrl: "https://console.anthropic.com/settings/keys",
    signupUrl: "https://console.anthropic.com/",
  },
  gemini: {
    title: "Google Gemini",
    platformName: "Google AI Studio",
    description: "Gemini 본문 모델과 나노바나나 이미지 생성에 사용합니다.",
    placeholder: "AIza...",
    createUrl: "https://aistudio.google.com/apikey",
    signupUrl: "https://aistudio.google.com/",
  },
};

export default function ApiKeySettings({
  initialProviders,
  maskedKeys = {},
}: {
  initialProviders: Provider[];
  maskedKeys?: Partial<Record<Provider, string>>;
}) {
  const [values, setValues] = useState<Record<Provider, string>>({ openai: "", anthropic: "", gemini: "" });
  const [providers, setProviders] = useState(initialProviders);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Provider | null>(null);
  const label = (provider: Provider) => providerInfo[provider].title;

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
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) setMessage(result.error || "API 키 저장에 실패했습니다.");
    else {
      setMessage(`${label(provider)} API 키를 저장했습니다.`);
      setValues((current) => ({ ...current, [provider]: "" }));
      setProviders((current) => (current.includes(provider) ? current : [...current, provider]));
    }
    setPending(null);
  }

  async function remove(provider: Provider) {
    setPending(provider);
    const response = await fetch(`/api/settings/api-key?provider=${provider}`, { method: "DELETE" });
    const result = (await response.json().catch(() => ({}))) as { error?: string };
    setMessage(response.ok ? `${label(provider)} API 연결을 해제했습니다.` : result.error || "연결 해제에 실패했습니다.");
    if (response.ok) setProviders((current) => current.filter((item) => item !== provider));
    setPending(null);
  }

  return (
    <div className="settings-stack">
      {(Object.keys(providerInfo) as Provider[]).map((provider) => {
        const info = providerInfo[provider];
        const isRegistered = providers.includes(provider);

        return (
          <div className="key-row" key={provider}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
              <strong style={{ fontSize: "14px" }}>{info.title}</strong>
              {isRegistered ? (
                <span style={{ fontSize: "11px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px", background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }}>
                  등록 완료
                </span>
              ) : (
                <span style={{ fontSize: "11px", fontWeight: 600, padding: "2px 8px", borderRadius: "999px", background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}>
                  미등록
                </span>
              )}
            </div>

            <p style={{ margin: "4px 0 8px", fontSize: "12.5px", color: "var(--muted)" }}>{info.description}</p>

            {/* 2단 공식 플랫폼 바로가기 버튼 세트 (생성 + 가입) */}
            <div className="platform-link-group" style={{ margin: "8px 0 12px" }}>
              <a
                href={info.createUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-create-key"
                title={`${info.platformName} API 키 발급/생성 페이지로 이동`}
              >
                <KeyRound size={13} />
                <span>{info.platformName} API 키 발급/생성하기</span>
                <ExternalLink size={12} style={{ opacity: 0.8 }} />
              </a>

              {info.signupUrl && (
                <a
                  href={info.signupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-platform-signup"
                  title={`${info.platformName} 공식 웹사이트/회원가입으로 이동`}
                >
                  <UserPlus size={13} />
                  <span>{info.platformName} 회원가입 / 로그인</span>
                  <ExternalLink size={12} style={{ opacity: 0.8 }} />
                </a>
              )}
            </div>

            {maskedKeys[provider] && (
              <div style={{ marginBottom: "6px" }}>
                <code className="saved-key-inline">계정 등록 키: {maskedKeys[provider]}</code>
              </div>
            )}

            <div className="key-actions">
              <input
                type="password"
                placeholder={isRegistered ? "새 키로 변경하려면 입력하세요" : info.placeholder}
                value={values[provider]}
                onChange={(event) => setValues((current) => ({ ...current, [provider]: event.target.value }))}
                autoComplete="off"
              />
              <button className="small-button" onClick={() => void save(provider)} disabled={pending !== null || !values[provider].trim()}>
                {pending === provider ? "저장 중..." : isRegistered ? "키 변경" : "저장"}
              </button>
              {isRegistered && (
                <button className="text-button" onClick={() => void remove(provider)} disabled={pending !== null}>
                  해제
                </button>
              )}
            </div>
          </div>
        );
      })}

      {message && (
        <p className="settings-message" role="status">
          {message}
        </p>
      )}

      <div className="notice" style={{ marginTop: "16px" }}>
        🔒 API 키는 회원님의 계정별로 안전하게 암호화 보관되며, 선택한 플랫폼의 키만 해당 블로그 글 생성 및 최적화에 사용됩니다.
      </div>
    </div>
  );
}
