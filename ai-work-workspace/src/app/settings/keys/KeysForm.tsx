"use client";
// U3: 키 입력·저장·삭제 + 📖 연동 매뉴얼 상자(팝업). 서버: /api/keys
import { useEffect, useState } from "react";

type Provider = "anthropic" | "openai" | "gemini";
const ITEMS: { provider: Provider; name: string; placeholder: string; desc: string; guideId: string }[] = [
  { provider: "anthropic", name: "Claude (Anthropic)", placeholder: "sk-ant-…", desc: "AI 비서 기본 엔진(Claude Sonnet). 빠른 작업은 Haiku를 씁니다.", guideId: "d03f65c2-efbb-421f-a041-a075562e3b7a" },
  { provider: "openai", name: "OpenAI (GPT)", placeholder: "sk-…", desc: "Claude 키가 없을 때 「자동」이 쓰는 엔진입니다.", guideId: "1c5c24e2-15d4-49b8-b907-0ac6843dee3a" },
  { provider: "gemini", name: "Google Gemini", placeholder: "AIza… 또는 AQ.…", desc: "Gemini Flash가 기본, 빠른 작업은 Flash-Lite. 무료 등급 키도 한도 안에서 쓸 수 있습니다.", guideId: "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4" },
];
const GUIDE_URL = (id: string) => `https://www.buylife.xyz/guides/${id}`;
const openGuide = (id: string) => window.open(GUIDE_URL(id), "platform-guide-popup", "width=720,height=860,scrollbars=yes,resizable=yes");

export function KeysForm() {
  const [keys, setKeys] = useState<Record<Provider, string | null> | null>(null);
  const [inputs, setInputs] = useState<Record<Provider, string>>({ anthropic: "", openai: "", gemini: "" });
  const [msg, setMsg] = useState<Record<Provider, string>>({ anthropic: "", openai: "", gemini: "" });
  const [busy, setBusy] = useState<Provider | null>(null);

  const load = async () => {
    const r = await fetch("/api/keys", { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setKeys(j.keys);
  };
  useEffect(() => { void load(); }, []);

  const save = async (provider: Provider) => {
    setBusy(provider);
    const r = await fetch("/api/keys", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider, apiKey: inputs[provider] }) });
    const j = await r.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [provider]: r.ok ? "저장했습니다." : j.message ?? "저장하지 못했습니다." }));
    if (r.ok) { setInputs((v) => ({ ...v, [provider]: "" })); await load(); }
    setBusy(null);
  };
  const remove = async (provider: Provider) => {
    if (!window.confirm("이 키를 지울까요? 다른 AIMaster 프로그램에서도 이 키를 쓰지 않게 됩니다.")) return;
    setBusy(provider);
    const r = await fetch(`/api/keys?provider=${provider}`, { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setMsg((m) => ({ ...m, [provider]: r.ok ? "지웠습니다." : j.message ?? "지우지 못했습니다." }));
    if (r.ok) await load();
    setBusy(null);
  };

  return (
    <>
      <section className="aww-keys">
        {ITEMS.map((it) => (
          <div key={it.provider} className="aww-key-card">
            <div className="aww-key-head">
              <b>{it.name}</b>
              <span className={`aww-key-state ${keys?.[it.provider] ? "on" : ""}`}>{keys === null ? "확인 중…" : keys[it.provider] ? `등록됨 · ${keys[it.provider]}` : "등록 안 됨"}</span>
            </div>
            <p className="aww-key-desc">{it.desc}</p>
            <div className="aww-key-row">
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder={it.placeholder}
                value={inputs[it.provider]}
                onChange={(e) => setInputs((v) => ({ ...v, [it.provider]: e.target.value }))}
                aria-label={`${it.name} API 키`}
              />
              <button className="aww-btn primary small" disabled={busy !== null || !inputs[it.provider].trim()} onClick={() => void save(it.provider)}>
                {keys?.[it.provider] ? "바꾸기" : "저장"}
              </button>
              {keys?.[it.provider] && (
                <button className="aww-btn small" disabled={busy !== null} onClick={() => void remove(it.provider)}>
                  지우기
                </button>
              )}
            </div>
            {msg[it.provider] && <p className="aww-key-msg">{msg[it.provider]}</p>}
          </div>
        ))}
      </section>

      <section className="aww-key-guides">
        <h2>📖 연동 매뉴얼</h2>
        <p>키를 처음 받는다면 아래 매뉴얼을 팝업으로 열어 그대로 따라 하세요.</p>
        <div className="aww-key-guide-buttons">
          {ITEMS.map((it) => (
            <button key={it.provider} className="aww-btn small" onClick={() => openGuide(it.guideId)}>
              {it.name} API 키 발급받기 ↗
            </button>
          ))}
        </div>
      </section>
    </>
  );
}
