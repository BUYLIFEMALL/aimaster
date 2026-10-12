"use client";
import { useState } from "react";
import { SOURCES, type Provider } from "@/lib/studio/config";

export function KeySettings({
  provider,
  registered,
  onSaved,
}: {
  provider: Provider;
  registered: boolean;
  onSaved?: (keys: Record<Provider, boolean>) => void;
}) {
  const [key, setKey] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [tested, setTested] = useState(false);
  const name =
    provider === "gemini"
      ? "Google Gemini"
      : provider === "pixabay"
        ? "Pixabay"
        : "Pexels";
  const guide =
    provider === "gemini"
      ? "https://aistudio.google.com/apikey"
      : provider === "pixabay"
        ? "https://pixabay.com/api/docs/"
        : "https://www.pexels.com/api/new/";
  async function submit(action: "test" | "save") {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, key, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "요청에 실패했습니다.");
      if (action === "test") {
        setTested(true);
        setNotice(
          "연결 테스트에 성공했습니다. 새 키는 저장 버튼을 눌러 등록해 주세요.",
        );
      } else {
        setKey("");
        setTested(false);
        setNotice("본인 계정에 API 키를 저장했습니다.");
        onSaved?.(data.registered);
      }
    } catch (e) {
      setTested(false);
      setNotice(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="key-settings">
      <h3>{name} API 키</h3>
      <p className={tested ? "connected" : "muted"}>
        {tested
          ? "연결 테스트 성공"
          : registered
            ? "본인 키 등록됨 · 연결은 테스트로 확인"
            : "본인 API 키 등록 필요"}
      </p>
      <label>
        본인 API 키
        <input
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => {
            setKey(e.target.value);
            setTested(false);
            setNotice("");
          }}
          disabled={busy}
          maxLength={500}
          autoComplete="off"
          placeholder={
            registered
              ? "키를 바꾸려면 새 키를 입력하세요"
              : "본인 API 키를 입력하세요"
          }
        />
      </label>
      <div className="button-row">
        <button onClick={() => setShow((v) => !v)} disabled={busy}>
          {show ? "키 숨기기" : "키 보이기"}
        </button>
        <button
          onClick={() => submit("test")}
          disabled={busy || (!key.trim() && !registered)}
        >
          연결 테스트
        </button>
        <button
          className="primary"
          onClick={() => submit("save")}
          disabled={busy || !key.trim()}
        >
          {busy ? "처리 중…" : "본인 키 저장"}
        </button>
      </div>
      {notice && (
        <p role="status" className="status-note">
          {notice}
        </p>
      )}
      <div className="guide-box">
        <strong>📖 연동 매뉴얼</strong>
        <p>
          <a href={guide} target="_blank" rel="noopener noreferrer">
            {name}에서 본인 키 발급하기 ↗
          </a>
        </p>
        <p className="muted">
          본인 계정으로 발급한 키를 입력하세요.{" "}
          {provider === "gemini"
            ? "글귀와 AI 배경 생성에 사용합니다. 생성 비용은 본인 Google 계정에 적용됩니다."
            : "해당 제공처의 사진 검색에 사용합니다. AI 글귀 생성에는 Gemini 키가 따로 필요합니다."}
        </p>
      </div>
    </div>
  );
}

export function AllKeySettings({
  initial,
}: {
  initial: Record<Provider, boolean>;
}) {
  const [keys, setKeys] = useState(initial);
  return (
    <div className="settings-list">
      {SOURCES.map((source) => (
        <section className="card" key={source.id}>
          <KeySettings
            provider={source.id}
            registered={keys[source.id]}
            onSaved={setKeys}
          />
        </section>
      ))}
    </div>
  );
}
