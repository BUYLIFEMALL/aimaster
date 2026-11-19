"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { ModelState } from "@/lib/studio/presets";
import { SPEC_NOTICE_8GB } from "@/lib/studio/notices";
import { ENGINE_DOWNLOAD_URL, isKind, messageOf, useEngine } from "./useEngine";

type Status = { version?: string; features?: string[] } | null;

const card = "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5";
const button = "rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-bold text-black disabled:opacity-40";
const ghost = "rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm";

function Step({ no, title, done, children }: { no: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className={card}>
      <h2 className="flex items-center gap-2 text-base font-bold">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm ${done ? "bg-[var(--accent)] text-black" : "bg-[var(--line)]"}`}>{done ? "✓" : no}</span>
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted)]">{children}</div>
    </section>
  );
}

export function StartScreen({ memberId }: { memberId: string }) {
  const engine = useEngine(memberId);
  const [checked, setChecked] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [paired, setPaired] = useState(false);
  const [models, setModels] = useState<ModelState | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!engine) return;
    try {
      const s = await engine.getStatus();
      setStatus(s);
      setChecked(true);
      let isPaired = engine.isPaired();
      let m: ModelState | null = null;
      if (s && isPaired) {
        try {
          m = (await engine.getImageModels()) as ModelState;
        } catch (e) {
          if (isKind(e, "needPair")) isPaired = false;
          else setError(messageOf(e, "모델 상태를 읽지 못했습니다."));
        }
      }
      setPaired(isPaired);
      setModels(m);
    } catch {
      // 화면이 바뀐 뒤의 응답은 버린다
    }
  }, [engine]);

  // 화면이 열리면(또는 엔진 연결 계층이 바뀌면) 엔진 상태를 확인한다. 떠난 화면의 확인은 시작하지 않는다.
  useEffect(() => {
    const t = window.setTimeout(() => void refresh(), 0);
    return () => window.clearTimeout(t);
  }, [refresh]);

  const pair = async () => {
    if (!engine) return;
    setBusy(true);
    setError(null);
    try {
      await engine.pair(code);
      setCode("");
      await refresh();
    } catch (e) {
      setError(messageOf(e, "연결하지 못했습니다."));
    } finally {
      setBusy(false);
    }
  };
  const disconnect = () => {
    if (!engine) return;
    engine.disconnect();
    setModels(null);
    setPaired(false);
  };

  const engineOn = !!status;
  const canDraw = engineOn && !!status?.features?.includes("local-art");
  const recommended = (models?.families ?? []).flatMap((f) => f.variants ?? []).find((v) => v.id === models?.recommendedId) ?? null;
  const ready = engineOn && paired && !!models && !models.reason;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header>
        <h1 className="text-xl font-bold">🚀 시작하기</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">그림은 회원님 PC에서 그립니다. 처음 한 번만 아래 세 가지를 확인하면 됩니다.</p>
      </header>

      <Step no={1} title="내 PC 엔진 켜기" done={engineOn}>
        {!checked ? (
          <p>엔진을 찾는 중입니다…</p>
        ) : engineOn ? (
          <p>
            엔진이 켜져 있습니다{status?.version ? ` (버전 ${status.version})` : ""}.{!canDraw && " 이 엔진은 그림 기능이 없습니다. 엔진을 최신 버전으로 올려 주세요."}
          </p>
        ) : (
          <>
            <p>엔진이 응답하지 않습니다. 엔진 프로그램을 설치했다면 실행해 주세요.</p>
            <ol className="list-decimal space-y-1 pl-5">
              <li>아래 버튼으로 엔진 프로그램을 받아 설치합니다.</li>
              <li>설치한 엔진을 실행합니다(창에 연결 코드 6자리가 보입니다).</li>
              <li>이 화면에서 「다시 확인」을 누릅니다.</li>
            </ol>
            <a href={ENGINE_DOWNLOAD_URL} target="_blank" rel="noreferrer" className={`${button} inline-block`}>
              엔진 받기
            </a>
          </>
        )}
        <button type="button" onClick={() => void refresh()} className={ghost}>
          다시 확인
        </button>
      </Step>

      <Step no={2} title="엔진과 연결하기" done={engineOn && paired}>
        {paired ? (
          <>
            <p>이 브라우저가 엔진과 연결돼 있습니다.</p>
            <button type="button" onClick={disconnect} className={ghost}>
              연결 끊기
            </button>
            <p className="text-xs">연결을 끊으면 이 브라우저의 연결 정보만 지워집니다. 엔진에 남은 작업은 엔진 창에서 볼 수 있고, 앞서 맡긴 작업은 이 화면에서 더 볼 수 없게 됩니다.</p>
          </>
        ) : (
          <>
            <p>엔진 창에 보이는 숫자 6자리를 넣어 주세요.</p>
            <div className="flex gap-2">
              <input
                id="pair-code"
                aria-label="연결 코드 6자리"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                disabled={!engineOn || busy}
                placeholder="000000"
                className="w-36 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2.5 text-center text-lg tracking-widest"
              />
              <button type="button" onClick={() => void pair()} disabled={!engineOn || busy || code.length !== 6} className={button}>
                {busy ? "연결 중…" : "연결"}
              </button>
            </div>
          </>
        )}
      </Step>

      <Step no={3} title="그림 모델 준비" done={ready}>
        {!paired || !engineOn ? (
          <p>엔진과 연결하면 이 PC에 맞는 모델을 엔진이 알려 줍니다.</p>
        ) : !models ? (
          <p>모델 상태를 읽는 중입니다…</p>
        ) : models.reason ? (
          <p>{models.reason}</p>
        ) : (
          <>
            <p>
              엔진이 이 PC에 고른 구성: <b className="text-[var(--ink)]">{recommended ? `${recommended.familyName ?? recommended.family} ${recommended.quant ?? ""}` : "엔진이 정합니다"}</b>
              {recommended?.reason ? ` — ${recommended.reason}` : ""}
            </p>
            <p>모델 파일이 아직 없으면 첫 그림을 맡길 때 엔진이 알아서 받습니다(수 GB, 받는 동안 진행 상황이 작업 기록에 보입니다).</p>
          </>
        )}
        <p className="rounded-xl border border-[var(--line)] p-3 text-xs">ℹ️ {SPEC_NOTICE_8GB}</p>
      </Step>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {/* 준비가 안 됐을 때는 링크가 아니라 꺼진 버튼으로 둔다(키보드로도 넘어가지 못하게) */}
      {ready ? (
        <Link href="/create" className={`${button} block text-center`}>
          🎨 그림 만들러 가기
        </Link>
      ) : (
        <button type="button" disabled aria-describedby="not-ready" className={`${button} block w-full`}>
          🎨 그림 만들러 가기
        </button>
      )}
      {!ready && (
        <p id="not-ready" className="text-center text-xs text-[var(--muted)]">
          위 세 단계가 끝나면 누를 수 있습니다.
        </p>
      )}
    </div>
  );
}
