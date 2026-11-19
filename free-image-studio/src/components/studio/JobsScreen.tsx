"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { EngineJob, Submission } from "@/lib/engine";
import { dropFromDraft } from "@/lib/studio/batch";
import { PHASE_LABEL, again, buildRows, cancelAll, replace, restart, summarize, type Action, type Row } from "@/lib/studio/jobsView";
import { createSaveStore, type SavedInfo, type Writer } from "@/lib/studio/saveStore";
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
    if (action === "replace") return setConfirmReplace(id);
    void withRow(id, async () => {
      if (action === "confirm") {
        const r = await engine.confirm(id);
        if (r.state === "accepted") return "엔진이 이 그림을 받은 것을 확인했습니다.";
        return r.reason === "otherScope" ? "엔진 연결이 바뀌어 이 접수는 확인할 수 없습니다." : "엔진 목록에 없습니다. 받지 않았을 수도 있고, 이미 그린 뒤 목록에서 지워졌을 수도 있습니다.";
      }
      if (action === "resend") {
        const r = await engine.resend(id);
        return r.state === "accepted" ? "다시 보내 접수됐습니다." : "아직 접수되지 않았습니다.";
      }
      if (action === "cancel" && row.jobId) return void (await engine.cancel(row.jobId));
      if (action === "again") return void (await again(engine, id));
      if (action === "restart") return void (await restart(engine, id, jobs ?? []));
      if (action === "save" && row.jobId) {
        const jobId = row.jobId;
        const r = await saves.saveOnce(row, () => engine.fetchArt(jobId), write, { force });
        return r.saved ? `저장했습니다: ${r.info.name}` : `이미 저장한 그림입니다: ${r.info.name}`;
      }
      if (action === "dismiss" || action === "discard") {
        if (action === "dismiss" && row.jobId) {
          try {
            await engine.dismiss(row.jobId);
          } catch (e) {
            if (!isKind(e, "notFound")) throw e; // 엔진에서 이미 사라진 작업이면 기록만 지운다
          }
        }
        // 받았는지 모르는 접수는 사용자가 「기록에서 지우기」를 고른 것이므로 지운다(엔진이 그렸다면 엔진 창에 남는다).
        const sub = engine.submissions().find((x) => x.requestId === id);
        if (engine.forget(id, { force: true })) {
          saves.forget(id);
          // 맡기다 만 묶음에 같은 그림이 남아 있으면 함께 뺀다(지운 그림이 「이어서 맡기기」로 되살아나지 않게).
          if (sub) dropFromDraft(window.localStorage, memberId, sub);
        }
      }
    });
  };

  const doReplace = (id: string) => {
    if (!engine || !saves) return;
    setConfirmReplace(null);
    void withRow(id, async () => {
      const sub = engine.submissions().find((x) => x.requestId === id);
      const r = await replace(engine, id, true);
      saves.forget(id);
      // 새 기록이 같은 내용이라 묶음과 다시 짝이 맞지만, 새로 맡기기가 기록을 못 남긴 경우를 대비해 묶음에서도 뺀다.
      if (sub) dropFromDraft(window.localStorage, memberId, sub);
      return r.state === "accepted" ? "새로 맡겼습니다." : "새로 맡겼지만 엔진이 받았는지 확인하지 못했습니다.";
    });
  };

  const stopAll = () => {
    if (!engine || !jobs) return;
    void withRow("__all__", async () => {
      const r = await cancelAll(engine, jobs);
      return `${r.cancelled}개를 멈췄습니다${r.failed ? ` (${r.failed}개는 멈추지 못했습니다)` : ""}. 다시 그리려면 줄마다 「다시 시작」을 눌러 주세요.`;
    });
  };

  const activeJobs = (jobs ?? []).filter((j) => j.status === "queued" || j.status === "running").length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
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
        <section role="alertdialog" aria-labelledby="replace-title" className={`${card} border-amber-500/60`}>
          <h2 id="replace-title" className="text-sm font-bold">
            같은 그림이 두 번 나올 수 있습니다
          </h2>
          <p className="mt-2 text-sm text-[var(--muted)]">엔진이 이 그림을 받았는지 확인하지 못했습니다. 이미 받아서 그렸다면, 새로 맡기면 같은 그림을 한 번 더 그립니다. 그래도 새로 맡길까요?</p>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={() => doReplace(confirmReplace)} className={button}>
              새로 맡기기
            </button>
            <button type="button" onClick={() => setConfirmReplace(null)} className={ghost}>
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

      <p className="text-xs text-[var(--muted)]">그림과 설명은 회원님 PC와 이 브라우저에만 있습니다. 이 화면의 기록은 이 브라우저에 보관되며, 엔진은 그린 그림 파일을 하루 동안 보관합니다. 필요한 그림은 저장해 두세요.</p>
    </div>
  );
}
