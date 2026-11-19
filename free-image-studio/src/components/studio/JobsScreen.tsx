"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { EngineJob, Submission } from "@/lib/engine";
import { dropFromDraft } from "@/lib/studio/batch";
import { PHASE_LABEL, again, buildRows, cancelAll, cancelRow, dismissRow, replace, restart, sendMessage, summarize, type Action, type Row } from "@/lib/studio/jobsView";
import { createSaveStore, hasCrossTabLock, type SavedInfo, type Writer } from "@/lib/studio/saveStore";
import { LedgerNotice } from "./LedgerNotice";
import { isKind, messageOf, useEngine } from "./useEngine";

const card = "rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4";
const button = "rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-black disabled:opacity-40";
const ghost = "rounded-lg border border-[var(--line)] px-3 py-2 text-xs disabled:opacity-40";

const ACTION_LABEL: Record<Action, string> = {
  confirm: "엔진에 확인",
  replace: "새로 맡기기",
  resend: "다시 보내기",
  discard: "기록에서 지우기",
  cancel: "취소",
  save: "저장",
  again: "다시 만들기",
  restart: "다시 시작",
  dismiss: "지우기",
};

type DirHandle = { name: string; getFileHandle(name: string, opts: { create: boolean }): Promise<{ createWritable(): Promise<{ write(b: Blob): Promise<void>; close(): Promise<void> }> }> };
type PickerWindow = Window & { showDirectoryPicker?: (opts?: { mode?: string }) => Promise<DirHandle> };

export function JobsScreen({ memberId }: { memberId: string }) {
  const engine = useEngine(memberId);
  const saves = useMemo(() => (typeof window === "undefined" ? null : createSaveStore(window.localStorage, memberId)), [memberId]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [jobs, setJobs] = useState<EngineJob[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [working, setWorking] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Record<string, SavedInfo>>({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [dir, setDir] = useState<DirHandle | null>(null);
  const [confirmReplace, setConfirmReplace] = useState<string | null>(null);
  // 탭 사이 잠금을 쓸 수 있는 브라우저인가(화면이 뜬 뒤에 본다 — 서버에서 그릴 때는 알 수 없다)
  const [crossTab, setCrossTab] = useState(true);
  useEffect(() => setCrossTab(hasCrossTabLock()), []);
  const cancelButton = useRef<HTMLButtonElement | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const loading = useRef(false);
  const thumbLoading = useRef(new Set<string>());
  const urls = useRef<string[]>([]);

  const refresh = useCallback(async () => {
    if (!engine || loading.current) return;
    loading.current = true;
    try {
      setSubs(engine.submissions());
      if (saves) setSaved(saves.all());
      if (!engine.isPaired()) {
        setJobs(null);
        setListError("엔진과 연결돼 있지 않습니다. 「시작하기」에서 연결해 주세요.");
        return;
      }
      try {
        setJobs(await engine.listJobs());
        setListError(null);
      } catch (e) {
        const m = messageOf(e, "엔진의 작업 목록을 읽지 못했습니다.");
        if (m) {
          setJobs(null);
          setListError(m);
        }
      }
    } finally {
      loading.current = false;
    }
  }, [engine, saves]);

  // 화면이 보이는 동안만 3초마다 목록을 읽는다. 읽기만 하고, 엔진에 무엇을 보내거나 다시 맡기지 않는다.
  useEffect(() => {
    void refresh();
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 3000);
    return () => window.clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    const made = urls.current;
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const rows = useMemo(() => (engine ? buildRows(subs, jobs, { inScope: (id) => engine.inCurrentScope(id), canResend: (id) => engine.canResend(id), busy: (id) => working.has(id) }) : []), [engine, subs, jobs, working]);
  const sum = summarize(rows);

  // 완료된 그림의 미리보기(엔진에서 받아 이 화면에서만 본다 — 서버로 보내지 않는다)
  useEffect(() => {
    if (!engine) return;
    for (const r of rows) {
      if (r.phase !== "done" || !r.jobId || thumbs[r.requestId] || thumbLoading.current.has(r.requestId)) continue;
      thumbLoading.current.add(r.requestId);
      engine
        .fetchArt(r.jobId)
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          urls.current.push(url);
          setThumbs((t) => ({ ...t, [r.requestId]: url }));
        })
        .catch(() => {})
        .finally(() => thumbLoading.current.delete(r.requestId));
    }
  }, [engine, rows, thumbs]);

  const withRow = async (id: string, fn: () => Promise<string | void>) => {
    if (working.has(id)) return;
    setNotice(null);
    setWorking((w) => new Set(w).add(id));
    try {
      const msg = await fn();
      if (msg) setNotice(msg);
    } catch (e) {
      const m = messageOf(e, "처리하지 못했습니다.");
      if (m) setNotice(m);
    } finally {
      setWorking((w) => {
        const n = new Set(w);
        n.delete(id);
        return n;
      });
      void refresh();
    }
  };

  const write: Writer = async (name, blob) => {
    if (dir) {
      const file = await (await dir.getFileHandle(name, { create: true })).createWritable();
      await file.write(blob);
      await file.close();
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const pickFolder = async () => {
    const pick = (window as PickerWindow).showDirectoryPicker;
    if (!pick) return setNotice("이 브라우저는 폴더에 바로 저장할 수 없어, 저장을 누르면 내려받기로 받습니다. 크롬 계열 브라우저에서는 폴더를 고를 수 있습니다.");
    try {
      setDir(await pick({ mode: "readwrite" }));
    } catch {
      // 고르기를 취소함
    }
  };

  const act = (row: Row, action: Action, force = false) => {
    if (!engine || !saves) return;
    const id = row.requestId;
    if (action === "replace") {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      return setConfirmReplace(id);
    }
    void withRow(id, async () => {
      if (action === "confirm") {
        const r = await engine.confirm(id);
        if (r.state === "accepted") return "엔진이 이 그림을 받은 것을 확인했습니다.";
        return r.reason === "otherScope" ? "엔진 연결이 바뀌어 이 접수는 확인할 수 없습니다." : "엔진 목록에 없습니다. 받지 않았을 수도 있고, 이미 그린 뒤 목록에서 지워졌을 수도 있습니다.";
      }
      if (action === "resend") {
        return sendMessage(await engine.resend(id));
      }
      // 아래 동작은 실행 직전에 지금 연결 범위·지금 목록으로 다시 확인한다(화면에 보이던 줄이 예전 것일 수 있다).
      if (action === "cancel") return void (await cancelRow(engine, id));
      if (action === "again") return sendMessage(await again(engine, id), "새로 맡겨");
      if (action === "restart") return sendMessage(await restart(engine, id), "다시 맡겨");
      if (action === "save" && row.jobId) {
        const jobId = row.jobId;
        const r = await saves.saveOnce(row, () => engine.fetchArt(jobId), write, { force });
        return r.saved ? `저장했습니다: ${r.info.name}` : `이미 저장한 그림입니다: ${r.info.name}`;
      }
      if (action === "dismiss" || action === "discard") {
        if (action === "dismiss") {
          try {
            await dismissRow(engine, id);
          } catch (e) {
            if (!isKind(e, "notFound")) throw e; // 엔진에서 이미 사라진 작업이면 기록만 지운다(연결·상태가 바뀐 경우는 멈춘다)
          }
        }
        // 받았는지 모르는 접수는 사용자가 「기록에서 지우기」를 고른 것이므로 지운다(엔진이 그렸다면 엔진 창에 남는다).
        if (await engine.forget(id, { force: true })) {
          saves.forget(id);
          // 맡기다 만 묶음에서 이 접수 번호의 장을 뺀다(지운 그림이 「이어서 맡기기」로 되살아나지 않게). 내용이 같은 다른 장은 그대로다.
          dropFromDraft(window.localStorage, memberId, id);
        }
      }
    });
  };

  // 확인 창이 열리면 「그만두기」로 포커스를 옮기고, 닫히면 창을 연 버튼으로 돌려준다. Esc로 닫는다.
  useEffect(() => {
    if (!confirmReplace) return;
    cancelButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirmReplace(null);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener.current?.focus();
      opener.current = null;
    };
  }, [confirmReplace]);

  const doReplace = (id: string) => {
    if (!engine || !saves) return;
    setConfirmReplace(null);
    void withRow(id, async () => {
      const r = await replace(engine, id, true);
      saves.forget(id);
      // 옛 접수 번호의 장을 묶음에서 뺀다(새로 맡긴 그림은 새 접수 번호라 묶음과 무관하다).
      dropFromDraft(window.localStorage, memberId, id);
      return sendMessage(r, "새로 맡겨");
    });
  };

  const stopAll = () => {
    if (!engine || !jobs) return;
    void withRow("__all__", async () => {
      const r = await cancelAll(engine);
      return `${r.cancelled}개를 멈췄습니다${r.failed ? ` (${r.failed}개는 멈추지 못했습니다)` : ""}. 다시 그리려면 줄마다 「다시 시작」을 눌러 주세요.`;
    });
  };

  const activeJobs = (jobs ?? []).filter((j) => j.status === "queued" || j.status === "running").length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <LedgerNotice engine={engine} onChange={() => void refresh()} />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">📋 작업 기록</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            전체 {sum.total} · 완료 {sum.done} · 진행 {sum.active} · 실패·취소 {sum.failed}
            {sum.needCheck > 0 && ` · 확인 필요 ${sum.needCheck}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void pickFolder()} className={ghost}>
            📁 {dir ? `저장 폴더: ${dir.name}` : "저장 폴더 고르기"}
          </button>
          <button type="button" onClick={stopAll} disabled={!activeJobs || working.has("__all__")} className={ghost}>
            ⏹ 모두 멈추기
          </button>
        </div>
      </header>

      {sum.total > 0 && (
        <div className="h-2 overflow-hidden rounded-full bg-[var(--line)]" role="progressbar" aria-valuemin={0} aria-valuemax={sum.total} aria-valuenow={sum.done} aria-label="완료한 그림">
          <div className="h-full bg-[var(--accent)]" style={{ width: `${(sum.done / sum.total) * 100}%` }} />
        </div>
      )}

      {listError && (
        <p role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          {listError}{" "}
          <Link href="/start" className="underline">
            시작하기로 가기
          </Link>
        </p>
      )}
      {notice && (
        <p aria-live="polite" className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-sm">
          {notice}
        </p>
      )}

      {confirmReplace && (
        <section role="alertdialog" aria-modal="false" aria-labelledby="replace-title" aria-describedby="replace-desc" className={`${card} border-amber-500/60`}>
          <h2 id="replace-title" className="text-sm font-bold">
            같은 그림이 두 번 나올 수 있습니다
          </h2>
          <p id="replace-desc" className="mt-2 text-sm text-[var(--muted)]">엔진이 이 그림을 받았는지 확인하지 못했습니다. 이미 받아서 그렸다면, 새로 맡기면 같은 그림을 한 번 더 그립니다. 그래도 새로 맡길까요?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => doReplace(confirmReplace)} className={button}>
              새로 맡기기
            </button>
            <button type="button" ref={cancelButton} onClick={() => setConfirmReplace(null)} className={ghost}>
              그만두기
            </button>
          </div>
        </section>
      )}

      {rows.length === 0 ? (
        <section className={card}>
          <p className="text-sm text-[var(--muted)]">아직 맡긴 그림이 없습니다.</p>
          <Link href="/create" className={`${button} mt-3 inline-block`}>
            🎨 만들러 가기
          </Link>
        </section>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.requestId} className={`${card} flex flex-col gap-3 md:flex-row`}>
              <div className="flex h-28 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--line)] md:w-44">
                {thumbs[r.requestId] ? (
                  // eslint-disable-next-line @next/next/no-img-element -- 엔진에서 받은 그림(blob 주소)이라 이미지 최적화 대상이 아니다
                  <img src={thumbs[r.requestId]} alt={`${r.title} 미리보기`} className="h-full w-full object-contain" />
                ) : (
                  <span className="text-xs text-[var(--muted)]">{PHASE_LABEL[r.phase]}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-sm">{r.title}</b>
                  <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-xs">{PHASE_LABEL[r.phase]}</span>
                  {r.width && r.height && (
                    <span className="text-xs text-[var(--muted)]">
                      {r.width}×{r.height}
                    </span>
                  )}
                  {saved[r.requestId] && <span className="text-xs text-[var(--accent)]">저장함</span>}
                </div>
                <p className="mt-1 break-words text-xs text-[var(--muted)]">{r.prompt}</p>
                {r.stage && (r.phase === "queued" || r.phase === "running") && <p className="mt-1 text-xs">{r.stage}</p>}
                {r.phase === "done" && r.result?.seconds != null && <p className="mt-1 text-xs text-[var(--muted)]">{r.result.model ? `${r.result.model} · ` : ""}{r.result.seconds}초</p>}
                {r.error && <p className="mt-1 text-xs text-red-300">{r.error}</p>}
                {r.phase === "unknown" && <p className="mt-1 text-xs text-amber-200">엔진이 이 그림을 받았는지 확인하지 못했습니다. 자동으로 다시 맡기지 않습니다.</p>}
                {r.phase === "gone" && !r.error && <p className="mt-1 text-xs text-amber-200">엔진 목록에서 지워졌거나 정리된 작업입니다.</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {r.actions.map((a) => {
                    const resave = a === "save" && !!saved[r.requestId];
                    return (
                      <button key={a} type="button" onClick={() => act(r, a, resave)} disabled={working.has(r.requestId)} className={a === "save" || a === "confirm" || a === "resend" ? button : ghost}>
                        {resave ? "다시 저장" : ACTION_LABEL[a]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!crossTab && (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
          이 브라우저는 여러 탭이 동시에 저장하는 것을 막지 못합니다. 이 화면을 탭 두 개에 띄워 같은 그림을 동시에 저장하면 두 번 저장될 수 있으니, 저장은 한 탭에서만 해 주세요.
        </p>
      )}
      <p className="text-xs text-[var(--muted)]">그림과 설명은 회원님 PC와 이 브라우저에만 있습니다. 이 화면의 기록은 이 브라우저에 보관되며, 엔진은 그린 그림 파일을 하루 동안 보관합니다. 필요한 그림은 저장해 두세요.</p>
    </div>
  );
}
