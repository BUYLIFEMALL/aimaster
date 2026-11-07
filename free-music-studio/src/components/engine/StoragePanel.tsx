"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HardDrive, FolderCog, RefreshCw, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { EngineError, gb, getStorage, hasStorage, moveModelsFolder, removeStorageItem, type EngineStatus, type StorageReport } from "@/lib/engine";
import { groupStorageItems, storageGroupOf } from "@/lib/storageGroups";
import { FolderBrowser } from "./FolderBrowser";
import { StageProgress } from "./StageProgress";

type Msg = { type: "success" | "error"; text: string } | null;

/**
 * 모델 저장 공간(엔진 0.5.0, 2026-11-04 주인님: 「사용안하는 모델 삭제기능과 관련 내용을 표시해줘야」「설치할 폴더를 사용자가 지정하게」).
 * 모델 저장 폴더·남은 공간·항목별 실제 크기·안 쓰는 모델 지우기·다른 드라이브로 옮기기. 플랜 docs/PLAN_20261104_MODEL_STORAGE.md
 */
export function StoragePanel({ status, onChanged }: { status: EngineStatus | null; onChanged: () => void }) {
  const [report, setReport] = useState<StorageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [removing, setRemoving] = useState("");
  const [browsing, setBrowsing] = useState(false);
  const [mode, setMode] = useState<"move" | "fresh">("move");
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const supported = hasStorage(status);
  const moving = !!status?.stage?.startsWith("모델 폴더") || !!report?.moving;
  const wasMoving = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await getStorage());
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "저장 공간을 읽지 못했습니다." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (supported && status?.paired) void load();
  }, [supported, status?.paired, load]);

  // 옮기기가 끝나면 다시 잰다
  useEffect(() => {
    if (moving) wasMoving.current = true;
    else if (wasMoving.current) {
      wasMoving.current = false;
      void load();
      onChanged();
      if (!status?.error) setMessage({ type: "success", text: "모델 저장 폴더를 바꿨습니다. 실행 환경은 새 폴더에서 한 번 다시 만듭니다(설치 패키지를 받느라 몇 분 걸릴 수 있음)." });
    }
  }, [moving, load, onChanged, status?.error]);

  if (!status?.paired) return null;

  const remove = async (id: string) => {
    setRemoving(id);
    setMessage(null);
    try {
      const r = await removeStorageItem(id);
      setMessage({ type: r.partial ? "error" : "success", text: r.partial ? "일부 파일은 사용 중이라 남겼습니다. 엔진을 다시 켠 뒤 한 번 더 지워 보세요." : "지웠습니다." });
      await load();
      onChanged();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "지우지 못했습니다." });
    } finally {
      setRemoving("");
      setConfirm("");
    }
  };

  const apply = async (path: string) => {
    setApplying(true);
    setMessage(null);
    try {
      await moveModelsFolder(path, mode);
      setBrowsing(false);
      wasMoving.current = true;
      onChanged();
    } catch (e) {
      setMessage({ type: "error", text: e instanceof EngineError ? e.message : "모델 폴더를 바꾸지 못했습니다." });
    } finally {
      setApplying(false);
    }
  };

  const btn = "inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold disabled:opacity-40";
  const removable = report?.items.filter((i) => i.removable).reduce((a, b) => a + b.bytes, 0) ?? 0;

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-[#0a0f1d] p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100">
        <HardDrive className="h-4 w-4 text-sky-300" /> 음악 모델 저장 공간
      </h2>

      {!supported ? (
        <p className="text-[11px] text-amber-300/80">엔진 0.5.0 이상에서 받은 모델의 크기 보기·지우기·다른 드라이브로 옮기기를 쓸 수 있습니다. 아래 「원클릭 다운로드 센터」에서 새 엔진을 받아 주세요.</p>
      ) : (
        <>
          <p className="text-[11px] text-slate-500">음악 엔진 모델·실행 환경·설치 패키지가 쌓이는 곳입니다. 노래 파일(「노래 저장 폴더」)과는 따로이고, 여기서 지워도 만든 노래는 지워지지 않습니다.</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700/60 bg-slate-950/80 px-3.5 py-2.5 sm:col-span-3">
              <p className="text-[10px] text-slate-500">모델 저장 폴더{report?.isDefault ? " (처음 폴더)" : ""}</p>
              <p className="break-all font-mono text-xs text-slate-200">{report?.dir ?? status.modelsDir ?? "…"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
              <p className="text-[10px] text-slate-500">엔진이 쓰는 공간</p>
              <p className="text-sm font-bold text-slate-100">{report ? gb(report.totalBytes) : "…"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
              <p className="text-[10px] text-slate-500">그 드라이브 남은 공간</p>
              <p className="text-sm font-bold text-slate-100">{report ? gb(report.freeBytes) : "…"}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-3.5 py-2.5">
              <p className="text-[10px] text-slate-500">지워서 돌려받을 수 있는 공간</p>
              <p className="text-sm font-bold text-emerald-300">{report ? gb(removable) : "…"}</p>
            </div>
          </div>

          {moving && <StageProgress stage={status.stage} className="rounded-xl border border-teal-500/30 bg-teal-950/20 p-3" />}

          {!browsing && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => (setMessage(null), setBrowsing(true))} disabled={moving || applying} className={`${btn} bg-gradient-to-r from-sky-600 to-teal-600 text-white hover:brightness-110`}>
                <FolderCog className="h-4 w-4" /> 모델 폴더 바꾸기(다른 드라이브로)
              </button>
              <button type="button" onClick={load} disabled={loading || moving} className={`${btn} border border-slate-700 text-slate-300 hover:bg-slate-900`}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} 크기 다시 재기
              </button>
            </div>
          )}

          {browsing && (
            <FolderBrowser
              start={report?.dir ?? ""}
              current={report?.dir}
              title="📁 모델을 둘 폴더 고르기 — 남은 공간이 넉넉한 드라이브를 고르세요"
              confirmLabel="이 폴더로 바꾸기"
              busy={applying}
              onConfirm={apply}
              onClose={() => setBrowsing(false)}
              onError={(text) => setMessage({ type: "error", text })}
            >
              <div className="space-y-1.5 rounded-lg border border-slate-800 p-2.5 text-xs text-slate-300">
                <label className="flex items-start gap-2">
                  <input type="radio" name="fms-move-mode" checked={mode === "move"} onChange={() => setMode("move")} className="mt-0.5 accent-emerald-500" />
                  <span>
                    <b className="text-slate-100">받은 모델 옮기기(추천)</b> — 지금까지 받은 모델을 새 폴더로 옮깁니다. 같은 드라이브면 바로, 다른 드라이브면 복사한 뒤 예전 것을 지웁니다. 실행 환경은 새 폴더에서 다시 만듭니다(설치 패키지 몇 GB를 다시 받음).
                  </span>
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="fms-move-mode" checked={mode === "fresh"} onChange={() => setMode("fresh")} className="mt-0.5 accent-emerald-500" />
                  <span>
                    <b className="text-slate-100">새로 받기</b> — 예전 폴더의 모델을 지우고, 다음에 쓸 때 새 폴더로 처음부터 받습니다.
                  </span>
                </label>
                <p className="text-[11px] text-slate-500">⚠ 옮기는 동안(모델이 많으면 수십 분) 곡을 만들 수 없습니다. 사이트 연결·노래 파일·설정은 그대로입니다.</p>
              </div>
            </FolderBrowser>
          )}

          {report && (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full min-w-[560px] text-xs">
                <thead className="bg-slate-900/70 text-[11px] text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">항목</th>
                    <th className="px-3 py-2 text-right font-semibold">크기</th>
                    <th className="px-3 py-2 text-left font-semibold">상태</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {report.items.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                        아직 받은 모델이 없습니다.
                      </td>
                    </tr>
                  )}
                  {/* 음악 모델·음악 편집 도구·그림 모델·설치 보관 파일로 묶어서(2026-11-07) */}
                  {groupStorageItems(report.items).filter((g) => g.key !== "image").map((g) => [
                    <tr key={`g:${g.key}`} className="border-t border-slate-700 bg-slate-900/50">
                      <td className="px-3 py-2">
                        <span className="text-[12px] font-bold text-slate-100">{g.title}</span>
                        <span className="ml-2 text-[11px] text-slate-500">{g.desc}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-[11px] font-bold text-slate-300">{gb(g.bytes)}</td>
                      <td colSpan={2} className="px-3 py-2 text-[11px] text-slate-500">{g.items.length}개</td>
                    </tr>,
                    ...g.items.map((it) => (
                      <tr key={it.id} className="border-t border-slate-800 align-top">
                        <td className="px-3 py-2.5">
                          <p className="font-semibold text-slate-100">{it.label}</p>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{it.note}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-200">{gb(it.bytes)}</td>
                        <td className="whitespace-nowrap px-3 py-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${it.inUse ? "bg-emerald-500/15 text-emerald-200" : "bg-slate-700/40 text-slate-300"}`}>{it.inUse ? "사용 중" : "지금 안 씀"}</span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-2.5 text-right">
                          {it.removable && (
                            <button
                              type="button"
                              disabled={!!removing || moving}
                              onClick={() => (confirm === it.id ? remove(it.id) : setConfirm(it.id))}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 px-2.5 py-1 text-[11px] font-semibold text-rose-200 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              {removing === it.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                              {removing === it.id ? "지우는 중…" : confirm === it.id ? "정말 지우기" : "지우기"}
                            </button>
                          )}
                        </td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
          {report && report.items.some((it) => storageGroupOf(it.id) === "image") && (
            <p className="text-[11px] text-slate-500">
              🖼 그림 모델({gb(report.items.filter((it) => storageGroupOf(it.id) === "image").reduce((n, it) => n + it.bytes, 0))})은 음악 모델과 다른 폴더에 있어, 아래 「🖼 이미지용」에서 따로 관리합니다.
            </p>
          )}
          {loading && !report && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> 폴더 크기를 재는 중… (모델이 많으면 몇 초 걸립니다)
            </p>
          )}
        </>
      )}

      {message && (
        <p className={`flex items-center gap-2 text-xs font-semibold ${message.type === "success" ? "text-emerald-300" : "text-rose-300"}`}>
          {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />} {message.text}
        </p>
      )}
    </section>
  );
}
