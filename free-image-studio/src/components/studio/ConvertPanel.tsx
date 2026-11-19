"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CONVERT_PROVIDER_LABEL, costHint, findConvertModel, type ConvertProvider } from "@/lib/convert/models";
import { ConvertRequestError, applyConverted, canConvert, fetchConvertStatus, linesToConvert, loadConvertSettings, requestConversion, saveConvertSettings, type ApplyResult, type ConvertSettings, type ConvertStatus } from "@/lib/convert/client";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";
const button = "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40";
const ghost = "rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm disabled:opacity-40";

/**
 * 한글 설명을 영문으로 바꾸는 선택 기능. 꺼져 있는 것이 기본이다.
 * - 켜면 처음 한 번 비용 안내에 동의한다. 회원 본인 AI 키로 유료 호출이 나간다.
 * - 변환은 「변환」 버튼을 누를 때 한 번만 요청한다(자동 호출·자동 재시도 없음).
 * - 변환은 설명 칸의 글만 바꾼다. 그림을 엔진에 맡기는 것은 아래 「일괄 시작」으로 따로 한다.
 * - 실패하면 설명 칸의 글은 그대로다.
 */
export function ConvertPanel({ memberId, text, onText, disabled }: { memberId: string; text: string; onText: (next: string) => void; disabled: boolean }) {
  const [settings, setSettings] = useState<ConvertSettings>({ enabled: false, consent: false, model: null });
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [status, setStatus] = useState<ConvertStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; needKey: boolean } | null>(null);
  const [done, setDone] = useState<ApplyResult | null>(null);
  const latest = useRef(text);
  latest.current = text;

  // 회원별 설정을 되돌린다(회원이 바뀌면 그 회원 것으로).
  useEffect(() => {
    setSettings(loadConvertSettings(window.localStorage, memberId));
    setLoadedFor(memberId);
    setStatus(null);
    setStatusError(null);
    setAsking(false);
    setError(null);
    setDone(null);
  }, [memberId]);

  const update = (next: ConvertSettings) => {
    setSettings(next);
    if (loadedFor === memberId) saveConvertSettings(window.localStorage, memberId, next);
  };

  // 등록된 키와 고를 수 있는 모델을 읽는다(AI 호출이 아니다). 사용자가 켜려고 할 때만 읽는다.
  const readStatus = async (): Promise<ConvertStatus | null> => {
    setStatusError(null);
    try {
      const s = await fetchConvertStatus(fetch);
      setStatus(s);
      return s;
    } catch (e) {
      setStatus(null);
      setStatusError(e instanceof Error ? e.message : "등록된 키를 확인하지 못했습니다.");
      return null;
    }
  };
  useEffect(() => {
    if (loadedFor === memberId && settings.enabled && !status && !statusError) void readStatus();
  }, [loadedFor, memberId, settings.enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = useMemo(() => linesToConvert(text, () => "preview0"), [text]).items.length;
  const model = findConvertModel(settings.model);
  const hasAnyKey = !!status && status.models.length > 0;

  const turnOn = async () => {
    setError(null);
    const s = status ?? (await readStatus());
    if (!s) return;
    const chosen = findConvertModel(settings.model) && s.keys[findConvertModel(settings.model)!.provider] ? settings.model : s.defaultModel;
    if (settings.consent && chosen) update({ enabled: true, consent: true, model: chosen });
    else {
      setSettings((v) => ({ ...v, model: chosen }));
      setAsking(true); // 키가 없으면 이 창에서 등록 안내를 보여 준다
    }
  };

  const convert = async () => {
    if (busy || disabled || !model) return;
    setError(null);
    setDone(null);
    const { items, problem } = linesToConvert(text);
    if (problem) return setError({ message: problem, needKey: false });
    if (!items.length) return;
    setBusy(true);
    try {
      const results = await requestConversion(fetch, model.id, items); // 한 번만. 실패해도 다시 부르지 않는다
      const applied = applyConverted(latest.current, items, results);
      onText(applied.text);
      setDone(applied);
    } catch (e) {
      // 실패하면 설명 칸의 글은 건드리지 않는다.
      const needKey = e instanceof ConvertRequestError && (e.code === "needKey" || e.code === "auth");
      setError({ message: e instanceof Error ? e.message : "변환하지 못했습니다. 설명은 그대로 두었습니다.", needKey });
    } finally {
      setBusy(false);
    }
  };

  const keyLink = (
    <a href={`${MAIN_SITE_URL}/api-settings`} target="_blank" rel="noreferrer" className="underline">
      메인 사이트 「API 설정」 열기
    </a>
  );

  return (
    <div className="mt-4 rounded-xl border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">한글로 적고 영문으로 바꾸기 (선택)</p>
        {settings.enabled ? (
          <button type="button" onClick={() => update({ ...settings, enabled: false })} disabled={busy} className={ghost}>
            끄기
          </button>
        ) : (
          <button type="button" onClick={() => void turnOn()} disabled={busy || asking} className={ghost}>
            켜기
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        회원님이 등록한 AI 키로 한글 설명을 영문으로 바꿉니다. <b>유료 호출</b>이며 비용은 회원님 AI 계정에 청구됩니다. 꺼 두면 AI 키 없이 영문으로 직접 적어 그릴 수 있습니다.
      </p>

      {statusError && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {statusError}{" "}
          <button type="button" onClick={() => void readStatus()} className="underline">
            다시 확인
          </button>
        </p>
      )}

      {asking && status && (
        <div role="alertdialog" aria-labelledby="convert-title" aria-describedby="convert-desc" className="mt-3 rounded-xl border border-amber-500/40 p-3">
          {hasAnyKey && model ? (
            <>
              <h3 id="convert-title" className="text-sm font-bold">
                회원님의 {CONVERT_PROVIDER_LABEL[model.provider as ConvertProvider]} 키로 유료 호출이 됩니다
              </h3>
              <p id="convert-desc" className="mt-1 text-sm text-[var(--muted)]">
                「영문으로 변환」을 누를 때마다 AI를 한 번 부릅니다. {model.label} 기준 {costHint(model)}입니다(어림값). 자동으로 부르거나 실패했을 때 다시 부르지 않습니다. 변환한 글은 서버에 저장하지 않습니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    update({ enabled: true, consent: true, model: model.id });
                    setAsking(false);
                  }}
                  className={button}
                >
                  동의하고 켜기
                </button>
                <button type="button" autoFocus onClick={() => setAsking(false)} className={ghost}>
                  그만두기
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 id="convert-title" className="text-sm font-bold">
                AI 키 등록이 필요합니다
              </h3>
              <p id="convert-desc" className="mt-1 text-sm text-[var(--muted)]">
                OpenAI·Claude·Gemini 가운데 하나의 본인 API 키를 등록하면 켤 수 있습니다. 등록한 키는 다른 프로그램에서도 그대로 씁니다. {keyLink}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void readStatus()} className={ghost}>
                  등록했어요 — 다시 확인
                </button>
                <button type="button" autoFocus onClick={() => setAsking(false)} className={ghost}>
                  닫기
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {settings.enabled && status && (
        <div className="mt-3 space-y-3">
          <div>
            <label htmlFor="convert-model" className="text-xs font-bold">
              변환에 쓸 AI
            </label>
            <select id="convert-model" value={model?.id ?? ""} disabled={busy} onChange={(e) => update({ ...settings, model: e.target.value })} className="mt-1 block w-full rounded-xl border border-[var(--line)] bg-transparent px-3 py-2 text-sm">
              {!model && <option value="">모델을 골라 주세요</option>}
              {status.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {CONVERT_PROVIDER_LABEL[m.provider as ConvertProvider]} — {m.label}
                </option>
              ))}
            </select>
            {model && <p className="mt-1 text-xs text-[var(--muted)]">{costHint(model)} (어림값)</p>}
            {!hasAnyKey && (
              <p className="mt-1 text-xs text-amber-200">
                등록된 AI 키가 없습니다. {keyLink}
              </p>
            )}
          </div>
          <button type="button" onClick={() => void convert()} disabled={busy || disabled || !canConvert(settings, status, pending)} className={button}>
            {busy ? "변환하는 중…" : pending > 0 ? `한글 ${pending}줄 영문으로 변환 (AI 1회 호출 · 유료)` : "변환할 한글 줄이 없습니다"}
          </button>
          <p className="text-xs text-[var(--muted)]">변환은 위 설명 칸의 글만 바꿉니다. 바뀐 글을 확인한 뒤 아래 「일괄 시작」을 눌러야 그림을 그립니다.</p>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error.message} {error.needKey && keyLink}
        </p>
      )}

      {done && (
        <div className="mt-3 rounded-xl border border-[var(--line)] p-3" aria-live="polite">
          <p className="text-sm">
            {done.applied.length}줄을 영문으로 바꿨습니다.{done.skipped > 0 && ` 변환하는 동안 고치신 ${done.skipped}줄은 그대로 두었습니다.`} 위 설명 칸에서 고칠 수 있습니다.
          </p>
          <ol className="mt-2 space-y-1.5 text-xs">
            {done.applied.map((a) => (
              <li key={a.lineIndex}>
                <span className="text-[var(--muted)]">
                  {a.lineIndex + 1}. {a.ko}
                </span>
                <span className="block">→ {a.en}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
