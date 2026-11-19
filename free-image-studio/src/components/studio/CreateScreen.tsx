"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BATCH_MAX, COPIES_MAX, adoptDraft, buildPlan, clearDraft, confirmUncertain, discardUncertain, draftStatus, loadCompose, parseEntries, saveCompose, saveDraft, setLineCopies, submitRemaining, type DraftStatus, type RunResult } from "@/lib/studio/batch";
import { PRESETS, SIZE_CHOICES, findPreset, findSize, pickVariantId, type ModelState, type PresetId } from "@/lib/studio/presets";
import { messageOf, useEngine } from "./useEngine";

const card = "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5";
const button = "rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-black disabled:opacity-40";
const ghost = "rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm disabled:opacity-40";
const chip = (on: boolean) => `rounded-xl border px-3 py-2.5 text-sm ${on ? "border-[var(--accent)] bg-[var(--accent)]/15 font-bold" : "border-[var(--line)]"}`;

type FamilyChoice = "auto" | "z-image-turbo" | "flux2-klein-4b";

export function CreateScreen({ memberId }: { memberId: string }) {
  const engine = useEngine(memberId);
  const [presetId, setPresetId] = useState<PresetId>("photo");
  const [sizeId, setSizeId] = useState<(typeof SIZE_CHOICES)[number]["id"]>("wide");
  const [text, setText] = useState("");
  /** 적던 내용을 어느 회원 것으로 되돌렸는지 — 그 회원일 때만 다시 보관한다 */
  const [restoredFor, setRestoredFor] = useState<string | null>(null);
  const [family, setFamily] = useState<FamilyChoice>("auto");
  const [seedText, setSeedText] = useState("");
  const [models, setModels] = useState<ModelState | null>(null);
  // 맡기다 만 묶음의 상태 — 이어 맡길 수 있는 장 / 연결이 바뀐 장 / 예전 형식이라 맡겼는지 알 수 없는 장
  const [pending, setPending] = useState<DraftStatus>({ remaining: 0, otherScope: 0, legacy: 0, uncertain: 0 });
  const [dropAsk, setDropAsk] = useState(false);
  const [adoptAsk, setAdoptAsk] = useState(false);
  const left = pending.remaining;
  const stuck = pending.otherScope + pending.legacy;
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<[number, number] | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  const preset = findPreset(presetId)!;
  const size = findSize(sizeId)!;
  const familyId = family === "auto" ? preset.family : family;
  const variantId = useMemo(() => pickVariantId(models, familyId), [models, familyId]);
  const fixedSeed = seedText.trim() === "" ? null : Number(seedText);
  // 장수는 줄마다 정한다(줄 끝 「x2」, 표시가 없으면 1장). 아래 줄 목록의 버튼이 그 표시를 고쳐 준다.
  const entries = useMemo(() => parseEntries(text), [text]);
  const plan = useMemo(() => buildPlan({ text, preset, width: size.width, height: size.height, variantId, fixedSeed }), [text, preset, size, variantId, fixedSeed]);

  const readLeft = useCallback(() => {
    if (!engine) return;
    setPending(draftStatus(engine, window.localStorage));
  }, [engine, memberId]);

  // 적던 내용(줄·줄마다 장수·용도·비율)을 회원별로 보관했다가 되돌린다.
  // 회원이 바뀌면 그 회원 것으로 통째로 바꾸고(없으면 비운다), 되돌린 회원과 지금 회원이 같을 때만 보관한다 —
  // 앞 회원이 적던 글이 다음 회원 칸에 적히지 않는다.
  useEffect(() => {
    const c = loadCompose(window.localStorage, memberId);
    setText(c?.text ?? "");
    if (c && findPreset(c.presetId)) setPresetId(c.presetId as PresetId);
    const sz = c ? findSize(c.sizeId) : null;
    if (sz) setSizeId(sz.id);
    setRestoredFor(memberId);
  }, [memberId]);
  useEffect(() => {
    if (restoredFor === memberId) saveCompose(window.localStorage, memberId, { text, presetId, sizeId });
  }, [restoredFor, memberId, text, presetId, sizeId]);

  useEffect(() => {
    if (!engine) return;
    readLeft();
    engine
      .getImageModels()
      .then((m) => setModels(m as ModelState))
      .catch(() => setModels(null)); // 못 읽으면 구성 이름을 보내지 않고 엔진이 정하게 한다
  }, [engine, readLeft]);

  const run = async (fresh: boolean) => {
    if (!engine || running) return;
    setError(null);
    setResult(null);
    stop.current = false;
    setRunning(true);
    try {
      if (fresh) {
        if (plan.errors.length || !plan.items.length) return;
        saveDraft(window.localStorage, memberId, plan.items);
      }
      const out = await submitRemaining(engine, window.localStorage, { onProgress: (d, t) => setProgress([d, t]), shouldStop: () => stop.current });
      setResult(out);
      if (fresh && !out.stopped) setText("");
    } catch (e) {
      setError(messageOf(e, "맡기지 못했습니다."));
    } finally {
      setRunning(false);
      setProgress(null);
      readLeft();
    }
  };
  const discardLeft = () => {
    clearDraft(window.localStorage, memberId);
    readLeft();
    setResult(null);
  };

  const lineErrors = plan.errors.filter((e) => e.line > 0);
  const topErrors = plan.errors.filter((e) => e.line === 0 && text.trim() !== "");
  // 사용자가 확인한 경우에만: 지금 연결에서 맡길 수 없던 남은 장을 새 묶음(새 접수 번호)으로 옮겨 맡긴다.
  const adopt = () => {
    if (!engine) return;
    setAdoptAsk(false);
    setError(null);
    try {
      adoptDraft(engine, window.localStorage, true);
      readLeft();
      void run(false);
    } catch (e) {
      setError(messageOf(e, "남은 장을 옮기지 못했습니다."));
    }
  };

  // 받았는지 모르는 장을 엔진에 물어본다(같은 연결일 때만, 같은 접수 번호를 찾았을 때만 접수됨으로 적는다).
  const askUncertain = async () => {
    if (!engine || running) return;
    setError(null);
    setRunning(true);
    try {
      const r = await confirmUncertain(engine, window.localStorage);
      setError(r.reason === "otherScope" ? "엔진 연결이 바뀌어 이 그림들은 확인할 수 없습니다. 엔진 창에서 직접 확인해 주세요." : r.recovered ? `${r.recovered}장은 엔진이 받은 것을 확인했습니다. 작업 기록에서 볼 수 있습니다.` : "엔진 목록에서 찾지 못했습니다. 받지 않았을 수도 있고, 이미 그린 뒤 목록에서 지워졌을 수도 있습니다.");
    } catch (e) {
      setError(messageOf(e, "확인하지 못했습니다."));
    } finally {
      setRunning(false);
      readLeft();
    }
  };

  // 사용자가 확인한 경우에만: 엔진이 받았는지 알 수 없는 장을 묶음에서 지운다.
  const dropUncertain = () => {
    if (!engine) return;
    setDropAsk(false);
    try {
      discardUncertain(engine, window.localStorage, true);
    } catch (e) {
      setError(messageOf(e, "지우지 못했습니다."));
    }
    readLeft();
  };

  const canStart = !!engine && !running && left === 0 && stuck === 0 && pending.uncertain === 0 && plan.items.length > 0;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-xl font-bold">🎨 만들기</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">용도를 고르고 그림 설명을 한 줄에 하나씩 적으면, 내 PC가 차례로 그립니다. 한 번에 {BATCH_MAX}장까지 맡길 수 있습니다.</p>
      </header>

      {pending.uncertain > 0 && (
        <section className={`${card} border-amber-500/60`}>
          <p className="text-sm">
            맡기던 도중 끊겨, 엔진이 받았는지 알 수 없는 그림이 <b>{pending.uncertain}장</b> 있습니다. 이 그림은 자동으로 다시 맡기지 않습니다. 엔진 창에서 그려졌는지 확인한 뒤 아래에서 지워 주세요.
          </p>
          {dropAsk ? (
            <div role="alertdialog" aria-labelledby="drop-title" aria-describedby="drop-desc" className="mt-3 rounded-xl border border-amber-500/40 p-3">
              <h2 id="drop-title" className="text-sm font-bold">
                이 {pending.uncertain}장을 맡길 목록에서 지울까요?
              </h2>
              <p id="drop-desc" className="mt-1 text-sm text-[var(--muted)]">
                엔진이 이미 그렸다면 그 그림은 엔진 창에 남아 있습니다. 필요하면 지운 뒤 설명을 다시 적어 맡겨 주세요(이미 그려졌다면 같은 그림이 한 번 더 나옵니다).
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={dropUncertain} className={button}>
                  목록에서 지우기
                </button>
                <button type="button" autoFocus onClick={() => setDropAsk(false)} className={ghost}>
                  그만두기
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void askUncertain()} disabled={running} className={button}>
                엔진에 확인
              </button>
              <button type="button" onClick={() => setDropAsk(true)} disabled={running} className={ghost}>
                이 {pending.uncertain}장 정리하기…
              </button>
            </div>
          )}
        </section>
      )}

      {stuck > 0 && (
        <section className={`${card} border-amber-500/60`}>
          <p className="text-sm">
            {pending.legacy > 0
              ? `예전 방식으로 보관된 그림 ${pending.legacy}장이 있습니다. 이 가운데 어느 그림이 이미 엔진에 맡겨졌는지 알 수 없어 자동으로 이어 맡기지 않습니다.`
              : `앞서 맡기다 만 그림 ${pending.otherScope}장이 있는데, 그 뒤 엔진 연결이 바뀌었습니다. 연결이 달라진 채로는 이어 맡기지 않습니다.`}
          </p>
          {adoptAsk ? (
            <div role="alertdialog" aria-labelledby="adopt-title" aria-describedby="adopt-desc" className="mt-3 rounded-xl border border-amber-500/40 p-3">
              <h2 id="adopt-title" className="text-sm font-bold">
                {pending.legacy > 0 ? "같은 그림이 두 번 나올 수 있습니다" : "지금 연결에서 새로 맡길까요?"}
              </h2>
              <p id="adopt-desc" className="mt-1 text-sm text-[var(--muted)]">
                {pending.legacy > 0 ? "이미 엔진이 그린 그림이 섞여 있다면, 새로 맡기면 그 그림을 한 번 더 그립니다." : "아직 엔진에 보내지 않은 장만 지금 연결에서 새로 맡깁니다. 앞 연결에서 이미 맡긴 그림은 엔진 창에서 볼 수 있습니다."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={adopt} className={button}>
                  새로 맡기기
                </button>
                <button type="button" autoFocus onClick={() => setAdoptAsk(false)} className={ghost}>
                  그만두기
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => setAdoptAsk(true)} disabled={running} className={ghost}>
                남은 {stuck}장 새로 맡기기…
              </button>
              <button type="button" onClick={discardLeft} disabled={running} className={ghost}>
                남은 장 버리기
              </button>
            </div>
          )}
        </section>
      )}

      {left > 0 && (
        <section className={`${card} border-[var(--accent)]`}>
          <p className="text-sm">
            앞서 맡기다 만 그림이 <b>{left}장</b> 남아 있습니다. 이어서 맡기거나 버린 뒤에 새 묶음을 시작할 수 있습니다.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => void run(false)} disabled={running} className={button}>
              남은 {left}장 이어서 맡기기
            </button>
            <button type="button" onClick={discardLeft} disabled={running} className={ghost}>
              남은 장 버리기
            </button>
          </div>
        </section>
      )}

      <section className={card}>
        <h2 className="text-sm font-bold">1. 용도</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === presetId} onClick={() => setPresetId(p.id)} className={`${chip(p.id === presetId)} text-left`}>
              <span className="block text-lg">{p.emoji}</span>
              <span className="block">{p.label}</span>
              <span className="mt-1 block text-xs font-normal text-[var(--muted)]">{p.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="text-sm font-bold">2. 비율</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SIZE_CHOICES.map((s) => (
            <button key={s.id} type="button" aria-pressed={s.id === sizeId} onClick={() => setSizeId(s.id)} className={chip(s.id === sizeId)}>
              {s.label} <span className="text-xs text-[var(--muted)]">{s.width}×{s.height}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={card}>
        <label htmlFor="lines" className="text-sm font-bold">
          3. 그림 설명 — 한 줄에 그림 하나(영문)
        </label>
        <textarea
          id="lines"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          disabled={running}
          placeholder={`${preset.example}\n(한 줄 더 적으면 그림이 하나 더 만들어집니다)`}
          className="mt-3 w-full rounded-xl border border-[var(--line)] bg-transparent p-3 text-sm leading-relaxed"
        />
        <p className="mt-2 text-xs text-[var(--muted)]">내 PC 그림 모델은 영어만 읽습니다. 고른 용도에 맞는 표현(조명·구도·글자 없음 등)은 자동으로 덧붙습니다.</p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          한 줄에 한 장을 그립니다. 같은 설명으로 두 장이 필요하면 아래에서 그 줄을 {COPIES_MAX}장으로 바꾸거나, 줄 끝에 <code>x2</code>를 적어 주세요.
        </p>
        {entries.length > 0 && (
          <ol className="mt-3 space-y-1.5" aria-label="줄마다 그릴 장수">
            {entries.map((e, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="w-7 shrink-0 text-right text-xs text-[var(--muted)]">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate" title={e.source}>
                  {e.source || "(설명 없음)"}
                </span>
                <span role="group" aria-label={`${i + 1}번째 줄 장수`} className="flex shrink-0 gap-1">
                  {Array.from({ length: COPIES_MAX }, (_, k) => k + 1).map((n) => (
                    <button key={n} type="button" disabled={running} aria-pressed={e.badCopies === undefined && e.copies === n} onClick={() => setText((t) => setLineCopies(t, i, n))} className={`${chip(e.badCopies === undefined && e.copies === n)} px-2.5 py-1.5 text-xs`}>
                      {n}장
                    </button>
                  ))}
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className={`mt-3 text-right text-sm font-bold ${plan.total > BATCH_MAX ? "text-red-300" : ""}`} aria-live="polite">
          지금 {plan.total}장 · {BATCH_MAX}장까지
        </p>
        {(topErrors.length > 0 || lineErrors.length > 0) && (
          <ul role="alert" className="mt-3 space-y-1 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
            {topErrors.map((e) => (
              <li key={e.message}>{e.message}</li>
            ))}
            {lineErrors.map((e) => (
              <li key={e.line}>
                {e.line}번째 줄: {e.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className={card}>
        <summary className="cursor-pointer text-sm font-bold">고급 설정</summary>
        <div className="mt-3 space-y-4 text-sm">
          <div>
            <p className="font-bold">그림 모델</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["auto", "용도에 맞게(권장)"],
                  ["z-image-turbo", "Z-Image Turbo"],
                  ["flux2-klein-4b", "FLUX.2 klein 4B"],
                ] as const
              ).map(([id, label]) => (
                <button key={id} type="button" aria-pressed={family === id} onClick={() => setFamily(id)} className={chip(family === id)}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-[var(--muted)]">{variantId ? `쓸 구성: ${variantId} (이 PC에 맞는 구성을 엔진이 골랐습니다)` : "구성은 엔진이 정합니다."}</p>
          </div>
          <div>
            <label htmlFor="seed" className="font-bold">
              시드(비워 두면 그림마다 무작위)
            </label>
            <input id="seed" inputMode="numeric" value={seedText} onChange={(e) => setSeedText(e.target.value.replace(/\D/g, "").slice(0, 10))} className="mt-2 block w-40 rounded-xl border border-[var(--line)] bg-transparent px-3 py-2" />
          </div>
        </div>
      </details>

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {running ? (
        <div className={card}>
          <p className="text-sm">엔진에 맡기는 중입니다{progress ? ` (${progress[0]} / ${progress[1]})` : "…"}</p>
          <button type="button" onClick={() => (stop.current = true)} className={`${ghost} mt-3`}>
            그만 맡기기
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => void run(true)} disabled={!canStart} className={`${button} w-full text-base`}>
          {plan.items.length > 0 ? `▶ ${plan.items.length}장 일괄 시작` : "▶ 일괄 시작"}
        </button>
      )}

      {result && (
        <section className={card} aria-live="polite">
          <p className="text-sm">
            {result.sent}장을 엔진에 맡겼습니다.{result.stopped ? ` 중간에 멈췄습니다 — ${result.stopped.message}` : " 이제 화면을 닫아도 엔진이 켜져 있으면 계속 그립니다."}
            {result.remaining > 0 && ` 남은 ${result.remaining}장은 위에서 이어서 맡길 수 있습니다.`}
          </p>
          <Link href="/jobs" className={`${button} mt-3 inline-block`}>
            📋 작업 기록 보기
          </Link>
        </section>
      )}
    </div>
  );
}
