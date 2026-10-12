"use client";
import Link from "next/link";
import { useState } from "react";
import { MODELS, PROVIDERS, type Provider } from "@/lib/studio/config";
const NAMES = { gemini: "Gemini", openai: "OpenAI", anthropic: "Claude" };
const LINKS = {
  gemini: "https://aistudio.google.com/apikey",
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
};
export function KeySettings({
  initial,
}: {
  initial: Record<Provider, boolean>;
}) {
  const [registered, setRegistered] = useState(initial);
  const [key, setKey] = useState<Record<Provider, string>>({
    gemini: "",
    openai: "",
    anthropic: "",
  });
  const [model, setModel] = useState<Record<Provider, string>>({
    gemini: MODELS[0].id,
    openai: MODELS[2].id,
    anthropic: MODELS[4].id,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function submit(provider: Provider, action: "save" | "test") {
    setBusy(true);
    setNotice("");
    try {
      const r = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          action,
          key: key[provider],
          model: model[provider],
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      if (d.registered) {
        setRegistered(d.registered);
        setKey((k) => ({ ...k, [provider]: "" }));
      }
      setNotice(
        action === "save"
          ? `${NAMES[provider]} 본인 키를 저장했습니다.`
          : `${NAMES[provider]} 모델 조회 테스트가 성공했습니다. 생성 가능 여부와 사용 요금은 공급사에서 확인하세요.`,
      );
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "요청 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <p role="status" className="notice">
        {notice ||
          "저장된 키 원문은 표시하지 않습니다. 기존 AIMaster 개인 키를 그대로 사용합니다."}
      </p>
      <div className="settings-list">
        {PROVIDERS.map((p) => (
          <section className="card" key={p}>
            <div className="section-title">
              <h2>{NAMES[p]}</h2>
              <span className="pill">
                {registered[p] ? "본인 키 등록됨" : "등록 필요"}
              </span>
            </div>
            <label>
              본인 API 키
              <input
                type="password"
                autoComplete="off"
                value={key[p]}
                onChange={(e) => setKey((k) => ({ ...k, [p]: e.target.value }))}
                placeholder={
                  registered[p]
                    ? "변경할 때만 새 키를 입력하세요"
                    : "본인 계정에서 발급한 키"
                }
              />
            </label>
            <label>
              테스트 모델
              <select
                value={model[p]}
                onChange={(e) =>
                  setModel((m) => ({ ...m, [p]: e.target.value }))
                }
              >
                {MODELS.filter((m) => m.provider === p).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              <button
                disabled={busy || !key[p].trim()}
                className="primary"
                onClick={() => submit(p, "save")}
              >
                본인 키 저장
              </button>
              <button
                disabled={busy || (!registered[p] && !key[p].trim())}
                onClick={() => submit(p, "test")}
              >
                모델 조회 테스트
              </button>
              <a href={LINKS[p]} target="_blank" rel="noopener noreferrer">
                본인 키 발급 ↗
              </a>
            </div>
          </section>
        ))}
      </div>
      <section className="card guide-box">
        <h2>연동 매뉴얼</h2>
        <p>
          1. 사용할 AI 서비스에 본인 계정으로 로그인하여 API 키를 발급합니다.
        </p>
        <p>2. 위 입력란에서 저장한 뒤 모델 조회 테스트를 실행합니다.</p>
        <p>
          3. 작업 화면에서 같은 공급사·모델을 선택합니다. 생성 비용은 본인
          공급사 계정에 청구됩니다.
        </p>
        <p>
          Suno 웹사이트 이용에는 Suno API 키가 필요 없습니다. 실제 음악 API
          생성은 별도 ‘음악(SUNO)자동화’에서 본인 Suno 제공처 키로 진행합니다.
        </p>
        <Link href="/?section=guide">자세한 사용 순서 보기</Link>
      </section>
    </>
  );
}
