"use client";
import { useCallback, useEffect, useState } from "react";
import { MODELS, modelSchema, type Options } from "@/lib/translation/model";
import { GEMINI_GUIDE, MAIN_SITE } from "@/lib/version";
export function Settings({
  options,
  change,
  busy,
}: {
  options: Options;
  change: (options: Options) => void;
  busy: boolean;
}) {
  const [hasKey, setHasKey] = useState<boolean | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  const check = useCallback(async () => {
    setPending(true);
    setError("");
    try {
      const r = await fetch("/api/keys", { cache: "no-store" }),
        body = await r.json();
      if (!r.ok)
        throw new Error(body.error ?? "키 상태를 확인하지 못했습니다.");
      if (typeof body.hasKey !== "boolean")
        throw new Error("키 상태를 읽지 못했습니다.");
      setHasKey(body.hasKey);
    } catch (e) {
      setHasKey(null);
      setError(
        e instanceof Error ? e.message : "키 상태를 확인하지 못했습니다.",
      );
    } finally {
      setPending(false);
    }
  }, []);
  useEffect(() => {
    void check();
  }, [check]);
  return (
    <div className="settings-stack">
      <section className="card">
        <h2>본인 Gemini 키</h2>
        <p>
          번역·문서 정리·재검수·역번역에 회원님 본인의 Gemini 계정을 사용합니다.
        </p>
        <div className="key-state">
          <span className={`status ${hasKey ? "success" : ""}`}>
            {pending
              ? "확인 중…"
              : hasKey === null
                ? "확인 필요"
                : hasKey
                  ? "등록됨"
                  : "등록 필요"}
          </span>
          <button onClick={check} disabled={pending}>
            등록 상태 다시 확인
          </button>
        </div>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <a
          className="button primary"
          href={`${MAIN_SITE}/api-settings`}
          target="_blank"
          rel="noopener noreferrer"
        >
          본인 API 키 등록·수정
        </a>
        <p className="muted">등록 후 이 화면에서 상태를 다시 확인해주세요.</p>
      </section>
      <section className="card">
        <h2>번역 모델</h2>
        <label>
          사용할 Gemini 모델
          <select
            disabled={busy}
            value={options.model}
            onChange={(e) =>
              change({ ...options, model: modelSchema.parse(e.target.value) })
            }
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <p className="muted">
          변경한 모델은 현재 작업에 적용됩니다. 프로젝트를 저장하면 언어·모델
          설정도 함께 보관됩니다.
        </p>
      </section>
      <section className="card manual">
        <h2>📖 연동 매뉴얼</h2>
        <p>Gemini 키 발급과 등록 방법을 새 창에서 확인할 수 있습니다.</p>
        <button
          onClick={() =>
            window.open(
              GEMINI_GUIDE,
              "gemini-key-guide",
              "width=1000,height=780,scrollbars=yes",
            )
          }
        >
          Gemini API 키 발급받기
        </button>
      </section>
    </div>
  );
}
