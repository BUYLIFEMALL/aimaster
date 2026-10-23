"use client";

import { useState } from "react";
import { SOURCES, type Provider } from "@/lib/studio/config";
import {
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Save,
} from "lucide-react";

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
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-bold text-slate-900 m-0">{name} API 키</h3>
      </div>
      <p className={tested ? "connected" : "muted"}>
        {tested
          ? "✓ 연결 테스트 성공"
          : registered
            ? "✓ 본인 키 등록됨 · 연결은 테스트로 확인"
            : "본인 API 키 등록 필요"}
      </p>

      <label>
        본인 API 키
        <div className="relative mt-1">
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
                ? "키를 변경하려면 새 키를 입력하세요"
                : "본인 API 키를 입력하세요"
            }
          />
        </div>
      </label>

      <div className="button-row justify-start mt-3">
        <button
          type="button"
          className="flex items-center gap-1.5"
          onClick={() => setShow((v) => !v)}
          disabled={busy}
        >
          {show ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>{show ? "숨기기" : "보기"}</span>
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5"
          onClick={() => submit("test")}
          disabled={busy || (!key.trim() && !registered)}
        >
          <RefreshCw size={14} className={busy ? "animate-spin" : ""} />
          <span>연결 테스트</span>
        </button>
        <button
          type="button"
          className="primary flex items-center gap-1.5"
          onClick={() => submit("save")}
          disabled={busy || !key.trim()}
        >
          <Save size={14} />
          <span>{busy ? "처리 중…" : "본인 키 저장"}</span>
        </button>
      </div>

      {notice && (
        <p role="status" className="status-note mt-3">
          {notice}
        </p>
      )}

      <div className="guide-box">
        <strong className="flex items-center gap-1.5 text-xs text-slate-800">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>안전한 개인 API 키 발급 가이드</span>
        </strong>
        <p className="mt-2 text-xs">
          <a
            href={guide}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-700 font-semibold"
          >
            <span>{name}에서 본인 키 무료 발급받기</span>
            <ExternalLink size={12} />
          </a>
        </p>
        <p className="muted text-xs">
          회원 본인의 계정으로 직접 발급받은 키를 등록하여 안전하게 사용합니다.{" "}
          {provider === "gemini"
            ? "글귀와 AI 배경 생성에 사용되며, 생성 비용은 본인 Google 계정 크레딧에 청구됩니다."
            : "해당 제공처의 감성 사진 검색에 사용됩니다. (AI 글귀 생성에는 Gemini 키가 별도 필요합니다.)"}
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
